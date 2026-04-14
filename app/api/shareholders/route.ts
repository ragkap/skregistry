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
      (select
        fif.factset_entity_id,
        fi."name" as insti_name,
        'https://www.smartkarma.com/institutions/'||left(encode(convert_to(fif.factset_entity_id, 'UTF8'), 'base64'),-1)||'/funds' as insti_url,
        esr.total_holding as insti_total_holding,
        fifh.factset_fund_id,
        fif.fund_name,
        'https://www.smartkarma.com/funds/'||left(encode(convert_to(fif.factset_fund_id, 'UTF8'), 'base64'),-1)||'/holdings' as fund_url,
        fifh.latest_report_date as report_date,
        'Fund' as type,
        fifh.latest_holding as total_holding,
        fifh.previous_holding as previous_total_holding,
        case
          when esr.total_holding = 0 or esr.total_holding is null then null
          when esr.holding_percentage is null then null
          else (fifh.latest_holding / esr.total_holding) * esr.holding_percentage
        end as holding_percentage,
        fifh.latest_holding / nullif(fifh.previous_holding, 0) - 1 as change_in_percentage,
        array_agg(fif.factset_person_id) as person_ids,
        array_agg(fip."name") as person_names,
        array_agg('https://www.smartkarma.com/fund-managers/'||fip.id||'/funds') as person_urls,
        array_agg(fip.bio) as person_bios,
        array_agg(fip.email) as person_emails,
        array_agg(fip.direct_telephone) as person_phones,
        array_agg(fip.location_street1) as person_location_street1,
        array_agg(fip.location_street2) as person_location_street2,
        array_agg(fip.city_state_postal) as person_postal,
        array_agg(fip.country) as person_countries
      from factset_institution_fund_holdings fifh
      join factset_institution_funds fif on fif.factset_fund_id = fifh.factset_fund_id
      join factset_institutions fi on fi.factset_entity_id = fif.factset_entity_id
      left join factset_institution_people fip on fip.factset_person_id = fif.factset_person_id
      join entity_share_registries esr
        on esr.factset_entity_id = fif.factset_entity_id
        and esr.fsym_id = (select fsym_id from entity_fsym)
      where fifh.fsym_id = (select fsym_id from entity_fsym)
      group by 1,2,3,4,5,6,7,8,9,10,11,12)
    union
      (select
        esr.factset_entity_id,
        esr.name as insti_name,
        case
          when investor_type = 'Investor' then 'https://www.smartkarma.com/institutions/'||left(encode(convert_to(esr.factset_entity_id, 'UTF8'), 'base64'),-1)||'/funds'
          else null
        end as insti_url,
        esr.total_holding as insti_total_holding,
        null as factset_fund_id,
        null as fund_name,
        null as fund_url,
        esr.report_date,
        case
          when investor_type = 'Investor' then 'Institution'
          else 'Insider'
        end as type,
        esr.total_holding,
        esr.previous_total_holding,
        esr.holding_percentage,
        esr.change_in_percentage,
        null as person_ids,
        null as person_names,
        null as person_urls,
        null as person_bios,
        null as person_emails,
        null as person_phones,
        null as person_location_street1,
        null as person_location_street2,
        null as person_postal,
        null as person_countries
      from entity_share_registries esr
      where esr.fsym_id = (select fsym_id from entity_fsym))
    )
    select
      factset_entity_id,
      insti_name,
      insti_url,
      fund_name,
      fund_url,
      report_date,
      type,
      total_holding,
      previous_total_holding,
      holding_percentage,
      change_in_percentage,
      person_names,
      person_urls,
      person_bios,
      person_emails,
      person_phones,
      person_location_street1,
      person_location_street2,
      person_postal,
      person_countries
    from final_output
    order by insti_name, type desc, total_holding desc
  `;

  try {
    const result = await pool.query(query, [parseInt(entityId)]);
    return NextResponse.json(result.rows, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('Shareholder query error:', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
