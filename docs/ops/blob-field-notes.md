# Vercel Blob — bitácora de campo

Fotos opcionales en `POST /api/parcels/[parcelId]/field-notes` (multipart `photo`).

## Setup

1. Vercel Dashboard → Storage → create **Blob** store (link to `agro-ai-cursor` Preview + Production / stg).
2. Env: `BLOB_READ_WRITE_TOKEN` en Preview, Development (local `vercel env pull`) y Production cuando aplique.
3. Sin token: notas **sin** foto siguen funcionando; con foto → 400 “Almacenamiento de fotos no configurado”.

## Límites

- Tipos: `image/jpeg`, `image/png`, `image/webp`
- Tamaño: 4 MB
- Path: `field-notes/{orgId}/{parcelId}/{ts}.{ext}` (+ random suffix)
- Acceso: public URL en `photo_url`

## Migración

`drizzle/0013_parcel_field_notes_photo.sql` — columnas `photo_url`, `photo_content_type`.
