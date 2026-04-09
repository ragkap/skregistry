import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const entityId = request.nextUrl.searchParams.get('entityId');
  if (!entityId) return NextResponse.json({ error: 'entityId required' }, { status: 400 });

  const query = `
    with entity_fsym as (
      select fsd.fsym_id, e.id
      from entities e
      join factset_security_details fsd on e.isin = fsd.isin
      where e.id = $1
    ),
    final_output as (
      select
        fif.factset_entity_id,
        fi."name" as insti_name,
        'https://www.smartkarma.com/institutions/'||left(encode(convert_to(fif.factset_entity_id, 'UTF8'), 'base64'),-1)||'/funds' as insti_url,
        esr.total_holding as insti_total_holding,
        fifh.factset_fund_id,
        fif.fund_name,
        'https://www.smartkarma.com/funds/'||left(encode(convert_to(fif.factset_fund_id, 'UTF8'), 'base64'),-1)||'/holdings' as fund_url,
        fifh.latest_report_date as report_date,
        fifh.latest_holding as fund_total_holding,
        fifh.previous_holding as fund_previous_total_holding,
        case
          when esr.total_holding = 0 or esr.total_holding is null then null
          when fifh.latest_holding / esr.total_holding > 1 then 1
          else fifh.latest_holding / esr.total_holding
        end as holding_percentage,
        fifh.latest_holding / nullif(fifh.previous_holding, 0) - 1 as change_in_percentage,
        array_agg(fif.factset_person_id) as person_ids,
        array_agg(fip."name") as person_names,
        array_agg('https://www.smartkarma.com/fund-managers/'||fip.id||'/funds') as person_urls
      from factset_institution_fund_holdings fifh
      join factset_institution_funds fif on fif.factset_fund_id = fifh.factset_fund_id
      join factset_institutions fi on fi.factset_entity_id = fif.factset_entity_id
      left join factset_institution_people fip on fip.factset_person_id = fif.factset_person_id
      join entity_share_registries esr
        on esr.factset_entity_id = fif.factset_entity_id
        and esr.fsym_id = (select fsym_id from entity_fsym)
      where fifh.fsym_id = (select fsym_id from entity_fsym)
      group by 1,2,3,4,5,6,7,8,9,10,11
      order by esr.total_holding desc
    )
    select
      insti_name, insti_url, fund_name, fund_url,
      report_date, fund_total_holding, fund_previous_total_holding,
      holding_percentage, change_in_percentage, person_names, person_urls,
      factset_entity_id, insti_total_holding
    from final_output
  `;

  try {
    const result = await pool.query(query, [parseInt(entityId)]);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Shareholder query error:', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
