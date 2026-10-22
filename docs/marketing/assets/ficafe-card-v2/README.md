# Tarjeta FICAFÉ · propuesta minimalista

Propuesta editable para revisión. El formato **90 × 50 mm** es provisional.
Conserva la identidad del arte original en `../ficafe-card/`, cuyos archivos
no se modifican.

## Arte

- `card-front.svg` y `card-back.svg`: originales editables, texto vivo y QR vectorial.
- `card-preview.png`: vista de frente y reverso.
- `card-front.png` y `card-back.png`: revisión raster a 300 dpi en formato nominal.
- `card-review.pdf`: dos páginas a tamaño nominal, rasterizadas para revisar, **no arte final de imprenta**.
- `scripts/render-ficafe-card-v2.py`: regeneración de los archivos de esta carpeta con Pillow, qrcode, Fraunces y Source Sans 3.

El QR codifica exactamente `https://geoagro.ai/f26`, con una quiet zone de
cuatro módulos. La ruta propuesta debe estar **publicada y verificada en el
dominio real antes de imprimir o distribuir**. En esta revisión, el destino
esperado de su único 307 es:

```text
https://geoagro.ai/sign-up?utm_source=ficafe&utm_medium=card&utm_campaign=ficafe_cusco_202611
```

La ruta y sus UTM no demuestran que Clerk o la aplicación conserven la
atribución después de completar el alta. Ese flujo requiere una comprobación
separada.

## Pendiente de imprenta

Confirmar tamaño físico, sangrado, zona segura, perfil CMYK, papel, reproducción
de Fraunces y Source Sans 3, y escaneo del QR en una prueba física. El SVG usa
fuentes de texto vivo; el PDF actual no incluye sangrado ni fuentes editables.
No usar estos archivos como arte final sin esos controles.
