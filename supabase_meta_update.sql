-- Ejecutar esto en el SQL Editor de tu cuenta de Supabase.

-- Agregar columnas para los Metadatos Customizados en la tabla links
ALTER TABLE links ADD COLUMN custom_title VARCHAR(255);
ALTER TABLE links ADD COLUMN custom_description VARCHAR(500);
ALTER TABLE links ADD COLUMN custom_image VARCHAR(1000);
