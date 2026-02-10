
-- Enrich existing 20 countries with locale/currency data
UPDATE countries SET iso_alpha3 = 'IND', currency_code = 'INR', currency_symbol = '₹', date_format = 'DD/MM/YYYY', number_format = '#,##,###.##', phone_code_display = '+91 (India)' WHERE code = 'IN';
UPDATE countries SET iso_alpha3 = 'USA', currency_code = 'USD', currency_symbol = '$', date_format = 'MM/DD/YYYY', number_format = '#,###.##', phone_code_display = '+1 (US)' WHERE code = 'US';
UPDATE countries SET iso_alpha3 = 'GBR', currency_code = 'GBP', currency_symbol = '£', date_format = 'DD/MM/YYYY', number_format = '#,###.##', phone_code_display = '+44 (UK)' WHERE code = 'GB';
UPDATE countries SET iso_alpha3 = 'CAN', currency_code = 'CAD', currency_symbol = 'CA$', date_format = 'YYYY-MM-DD', number_format = '#,###.##', phone_code_display = '+1 (CA)' WHERE code = 'CA';
UPDATE countries SET iso_alpha3 = 'AUS', currency_code = 'AUD', currency_symbol = 'A$', date_format = 'DD/MM/YYYY', number_format = '#,###.##', phone_code_display = '+61 (AU)' WHERE code = 'AU';
UPDATE countries SET iso_alpha3 = 'DEU', currency_code = 'EUR', currency_symbol = '€', date_format = 'DD.MM.YYYY', number_format = '#.###,##', phone_code_display = '+49 (DE)' WHERE code = 'DE';
UPDATE countries SET iso_alpha3 = 'FRA', currency_code = 'EUR', currency_symbol = '€', date_format = 'DD/MM/YYYY', number_format = '# ###,##', phone_code_display = '+33 (FR)' WHERE code = 'FR';
UPDATE countries SET iso_alpha3 = 'JPN', currency_code = 'JPY', currency_symbol = '¥', date_format = 'YYYY/MM/DD', number_format = '#,###', phone_code_display = '+81 (JP)' WHERE code = 'JP';
UPDATE countries SET iso_alpha3 = 'SGP', currency_code = 'SGD', currency_symbol = 'S$', date_format = 'DD/MM/YYYY', number_format = '#,###.##', phone_code_display = '+65 (SG)' WHERE code = 'SG';
UPDATE countries SET iso_alpha3 = 'ARE', currency_code = 'AED', currency_symbol = 'د.إ', date_format = 'DD/MM/YYYY', number_format = '#,###.##', phone_code_display = '+971 (AE)' WHERE code = 'AE';
UPDATE countries SET iso_alpha3 = 'NLD', currency_code = 'EUR', currency_symbol = '€', date_format = 'DD-MM-YYYY', number_format = '#.###,##', phone_code_display = '+31 (NL)' WHERE code = 'NL';
UPDATE countries SET iso_alpha3 = 'CHE', currency_code = 'CHF', currency_symbol = 'CHF', date_format = 'DD.MM.YYYY', number_format = '#,###.##', phone_code_display = '+41 (CH)' WHERE code = 'CH';
UPDATE countries SET iso_alpha3 = 'SWE', currency_code = 'SEK', currency_symbol = 'kr', date_format = 'YYYY-MM-DD', number_format = '# ###,##', phone_code_display = '+46 (SE)' WHERE code = 'SE';
UPDATE countries SET iso_alpha3 = 'BRA', currency_code = 'BRL', currency_symbol = 'R$', date_format = 'DD/MM/YYYY', number_format = '#.###,##', phone_code_display = '+55 (BR)' WHERE code = 'BR';
UPDATE countries SET iso_alpha3 = 'MEX', currency_code = 'MXN', currency_symbol = 'MX$', date_format = 'DD/MM/YYYY', number_format = '#,###.##', phone_code_display = '+52 (MX)' WHERE code = 'MX';
UPDATE countries SET iso_alpha3 = 'ZAF', currency_code = 'ZAR', currency_symbol = 'R', date_format = 'YYYY/MM/DD', number_format = '# ###,##', phone_code_display = '+27 (ZA)' WHERE code = 'ZA';
UPDATE countries SET iso_alpha3 = 'NZL', currency_code = 'NZD', currency_symbol = 'NZ$', date_format = 'DD/MM/YYYY', number_format = '#,###.##', phone_code_display = '+64 (NZ)' WHERE code = 'NZ';
UPDATE countries SET iso_alpha3 = 'IRL', currency_code = 'EUR', currency_symbol = '€', date_format = 'DD/MM/YYYY', number_format = '#,###.##', phone_code_display = '+353 (IE)' WHERE code = 'IE';
UPDATE countries SET iso_alpha3 = 'ISR', currency_code = 'ILS', currency_symbol = '₪', date_format = 'DD/MM/YYYY', number_format = '#,###.##', phone_code_display = '+972 (IL)' WHERE code = 'IL';
UPDATE countries SET iso_alpha3 = 'KOR', currency_code = 'KRW', currency_symbol = '₩', date_format = 'YYYY.MM.DD', number_format = '#,###', phone_code_display = '+82 (KR)' WHERE code = 'KR';
