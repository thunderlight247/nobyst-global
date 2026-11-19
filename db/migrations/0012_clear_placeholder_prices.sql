-- Clears the test prices that 0007_placeholder_prices.sql set, so no product can be bought at a
-- made-up price. Cleared products show "Ask for price" and cannot be checked out until a real
-- price is entered in the admin. A price someone already changed is left alone: each row is only
-- cleared while it still equals its placeholder value.
UPDATE products SET price_pesewas = NULL, updated_at = CURRENT_TIMESTAMP WHERE price_pesewas = 5000 AND slug IN ('open-ear-clip-earbuds', 'neckband-bluetooth-earphones', 'wired-earphones-with-mic', 'usb-adapter-set', 'microsd-memory-card', 'usb-c-cable-5-pack');
UPDATE products SET price_pesewas = NULL, updated_at = CURRENT_TIMESTAMP WHERE price_pesewas = 12000 AND slug IN ('over-ear-wireless-headphones', 'bluetooth-sleep-headband', 'smart-audio-glasses', 'bluetooth-business-headset', '65w-fast-charger', '5-in-1-multi-charging-cable', 'otg-card-reader-hub', 'magsafe-kickstand-case', 'magnetic-ring-phone-case', 'matte-privacy-glass-3-in-1', 'rotating-phone-tablet-stand', 'foldable-pocket-phone-stand', 'silicone-suction-phone-mount');
UPDATE products SET price_pesewas = NULL, updated_at = CURRENT_TIMESTAMP WHERE price_pesewas = 1000 AND slug IN ('usb-c-to-usb-c-cable');
UPDATE products SET price_pesewas = NULL, updated_at = CURRENT_TIMESTAMP WHERE price_pesewas = 35000 AND slug IN ('android-smartphone-6-64', 'huansheng-d1701-feature-phone', 'i16-pro-flip-phone', 'slim-smartphone-8-128', 'smartphone-12-256');
