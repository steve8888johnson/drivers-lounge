export const supabaseTableGroups = [
  {
    migration: '005_rc1_platform_groundwork.sql',
    tables: [
      'profiles', 'driver_passports', 'business_accounts', 'road_reports',
      'jobs', 'applications', 'loads', 'community_rooms', 'community_posts',
      'marketplace_listings', 'pilot_car_profiles', 'pilot_car_jobs',
      'petitions', 'petition_signatures'
    ]
  },
  {
    migration: '007_rc2_carrier_reviews.sql',
    tables: ['carriers', 'carrier_reviews', 'carrier_responses', 'carrier_review_reports']
  },
  {
    migration: '009_rc2_support_and_account_deletion.sql',
    tables: ['support_tickets', 'account_deletion_requests']
  },
  {
    migration: '011_rc2_driver_audio_ads.sql',
    tables: ['ad_campaigns', 'ad_events', 'saved_offers']
  },
  {
    migration: '013_rc2_ad_pricing_and_billing.sql',
    tables: ['ad_rate_cards', 'ad_redemptions']
  },
  {
    migration: '015_rc2_community_safety.sql',
    tables: ['community_reports']
  },
  {
    migration: '017_rc2_offer_delivery_preferences.sql',
    tables: ['communication_preferences']
  }
];

export const requiredSupabaseTables = supabaseTableGroups.flatMap(group => group.tables);
