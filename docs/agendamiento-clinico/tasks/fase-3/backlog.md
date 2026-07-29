# Fase 3 — Inteligencia operacional e integración (meses 8–12)

---

## F3-01 · Gateway FHIR R4

**Depende de:** F1-10

Exponer el modelo en el idioma del sector. Mapeo:
`Patient`, `Practitioner`+`PractitionerRole`, `Location`, `HealthcareService`,
`Schedule`, `Slot`, `Appointment`, `Encounter`.

**Alcance**
- Recursos de lectura y `POST /fhir/Appointment`
- Autorización con **SMART on FHIR**
- Validación contra el validador oficial en CI

**A verificar antes de fijar el mapeo:** qué perfiles nacionales aplican en la
jurisdicción del centro (muchos países publican guías de implementación propias),
y si el Argonaut Scheduling IG es relevante para el ecosistema local. No asumir.

**Criterios de aceptación**
- [ ] Los recursos validan contra el validador oficial de HL7
- [ ] SMART on FHIR con scopes correctos, probado contra un cliente real
- [ ] El gateway no expone nada que la API interna no autorice (misma capa de RLS)

---

## F3-02 · Adaptador HL7 v2

**Realidad operacional:** buena parte de los sistemas hospitalarios instalados aún
habla HL7 v2.x. Presupuestar esto, no asumir FHIR en el otro extremo.

- Mensajes `SIU^S12/S13/S14/S15` (agendamiento) y `ADT^A04/A08` (registro)
- Motor de integración (Mirth Connect o equivalente) con cola persistente
- Reconciliación de identidades entre sistemas

**Criterios de aceptación**
- [ ] Un mensaje malformado no bloquea la cola
- [ ] Toda transformación es reversible y auditada
- [ ] Prueba con mensajes reales anonimizados del sistema destino

---

## F3-03 · Telemedicina

- Videollamada embebida sin instalación, con sala de espera virtual
- Test de cámara, micrófono y conexión previo
- Degradación elegante a solo audio; plan B de llamada telefónica
- Registro de duración efectiva e incidencias técnicas (necesario para facturación)
- Consentimiento de grabación explícito

**Criterios de aceptación**
- [ ] Funciona en navegador móvil sin instalar nada
- [ ] Con conexión degradada, cae a audio sin cortar la sesión
- [ ] La grabación requiere consentimiento de ambas partes, registrado

---

## F3-04 · Analítica y modelo dimensional

- Proyecciones alimentadas por eventos hacia almacén analítico separado
- `fact_appointment` (grano: una cita) y `fact_slot_offering` (grano: un slot ofertado)
- **DTNA** (*Days to Third Next Available*) como métrica principal de acceso:
  más honesta que "primera hora disponible" porque descarta cancelaciones de último minuto
- Tablero operacional en vivo y reportes programados
- Exportación y API para BI corporativo

**Criterios de aceptación**
- [ ] Ninguna consulta analítica toca la base transaccional
- [ ] Datos seudonimizados en el almacén analítico
- [ ] Todas las métricas se derivan de `appointment_transition`, no de campos mutables

---

## F3-05 · Predicción de inasistencia — con salvaguardas

**Depende de:** F3-04 · **Lee `docs/adr/0005` antes de empezar.**

Técnicamente sencillo (gradient boosting, AUC típico 0,70–0,80).
Éticamente delicado, y por eso este ticket tiene restricciones duras.

**El riesgo real:** las variables predictivas de inasistencia correlacionan
fuertemente con vulnerabilidad socioeconómica. Un modelo usado para *restringir*
el acceso institucionaliza la desigualdad y crea un ciclo de retroalimentación:
el paciente recibe peor servicio, falta más, el modelo se confirma.

**Restricciones no negociables**
1. La predicción se usa para **agregar apoyo**, nunca para restringir acceso:
   más recordatorios, llamada personal, oferta de telemedicina, apoyo de transporte.
2. Prohibido usar atributos protegidos o proxies evidentes (dirección, previsión,
   nacionalidad) como variables del modelo.
3. Si se usa para sobrecupo, se aplica a nivel de **bloque agregado**
   ("este bloque rinde 82 % históricamente, agregar 1 cupo"), nunca de individuo.
4. Auditoría de disparidad de tasas de error entre subgrupos, no solo exactitud global.
5. Documentación del modelo, sus limitaciones y su gobernanza. Revisión humana.

**Criterios de aceptación**
- [ ] Prueba automatizada que falla si una variable prohibida entra al modelo
- [ ] Reporte de disparidad por subgrupo generado en cada reentrenamiento
- [ ] Ninguna ruta de código permite que el score restrinja el agendamiento
- [ ] Tarjeta del modelo publicada y revisada por el comité de ética del centro

---

## F3-06 · Optimización de agenda

- Recalibración de duraciones según `duration_actual` vs. planificado
- Sugerencia de ajustes de plantilla según demanda insatisfecha
- Sobrecupo dinámico por bloque

**Criterios de aceptación**
- [ ] Toda sugerencia requiere aprobación humana antes de aplicarse
- [ ] La simulación de impacto es obligatoria (reutiliza F1-05 y F1-06)
