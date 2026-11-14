-- Placeholder prices for testing checkout. Edit any product's price in the admin
-- Catalogue tab; these values are not real prices.
UPDATE products SET price_pesewas = 5000 WHERE slug IN ('open-ear-clip-earbuds', 'neckband-bluetooth-earphones', 'wired-earphones-with-mic', 'usb-adapter-set', 'microsd-memory-card', 'usb-c-cable-5-pack');
UPDATE products SET price_pesewas = 12000 WHERE slug IN ('over-ear-wireless-headphones', 'bluetooth-sleep-headband', 'smart-audio-glasses', 'bluetooth-business-headset', '65w-fast-charger', '5-in-1-multi-charging-cable', 'otg-card-reader-hub', 'magsafe-kickstand-case', 'magnetic-ring-phone-case', 'matte-privacy-glass-3-in-1', 'rotating-phone-tablet-stand', 'foldable-pocket-phone-stand', 'silicone-suction-phone-mount');
UPDATE products SET price_pesewas = 1000 WHERE slug IN ('usb-c-to-usb-c-cable');
UPDATE products SET price_pesewas = 35000 WHERE slug IN ('android-smartphone-6-64', 'huansheng-d1701-feature-phone', 'i16-pro-flip-phone', 'slim-smartphone-8-128', 'smartphone-12-256');
