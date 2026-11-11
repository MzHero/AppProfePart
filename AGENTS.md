# AGENTS.md — Particulando

La documentación de contexto del proyecto está en [CLAUDE.md](CLAUDE.md) (arquitectura, convenciones,
comandos y decisiones). Las reglas específicas de Expo están en [mobile/AGENTS.md](mobile/AGENTS.md).

Resumen:
- La app real es `mobile/` (Expo SDK 58 + Expo Router + TypeScript + NativeWind). Los comandos se corren
  desde `mobile/`.
- `client/` es el prototipo web viejo (Vite): solo referencia visual, no se desarrolla.
- `Images/` tiene las capturas de referencia de cada pantalla.
