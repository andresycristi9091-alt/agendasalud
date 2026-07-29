# ADR 0005 · Uso restringido de la predicción de inasistencia

**Estado:** Aceptado · **Fecha:** 2026-07

## Contexto

Predecir qué pacientes faltarán es técnicamente sencillo (gradient boosting sobre
historial, AUC típico 0,70–0,80) y comercialmente atractivo: permite sobrecupar
con precisión y recuperar capacidad perdida.

## El problema

Las variables que predicen inasistencia correlacionan fuertemente con vulnerabilidad
socioeconómica: distancia al centro, acceso a transporte, trabajo sin permiso para
ausentarse, carga de cuidado familiar.

Un modelo usado para **restringir** —negar autoagendamiento, sobrecupar
sistemáticamente a los de alto riesgo, exigir prepago— institucionaliza la
desigualdad y crea un ciclo de retroalimentación: el paciente recibe peor servicio,
falta más, el modelo se confirma, el servicio empeora.

## Decisión

Se permite construir el modelo, con estas restricciones **no negociables**:

1. **La predicción se usa exclusivamente para agregar apoyo, nunca para restringir
   acceso.** Más recordatorios, llamada personal, oferta de telemedicina,
   coordinación de transporte.
2. Prohibido usar atributos protegidos o proxies evidentes (dirección, previsión,
   nacionalidad, idioma) como variables del modelo.
3. Si se usa para sobrecupo, se aplica a nivel de **bloque agregado**
   ("este bloque rinde 82 % históricamente, agregar un cupo"), nunca de individuo.
4. Auditoría de disparidad de tasas de error entre subgrupos en cada reentrenamiento,
   no solo exactitud global.
5. Tarjeta del modelo documentada, con limitaciones y gobernanza explícitas,
   revisada por el comité de ética del centro.

## Cómo se hace cumplir

- Prueba automatizada que falla el build si una variable prohibida entra al modelo
- Prueba que verifica que ninguna ruta de código permite que el score restrinja
  el agendamiento
- Reporte de disparidad generado automáticamente en cada reentrenamiento

## Consecuencias

- ✅ Se captura el valor (recuperar capacidad) sin el daño
- ✅ Defendible ante auditoría y ante la comunidad atendida
- ❌ Menor ganancia de eficiencia que un uso irrestricto
- ❌ Requiere infraestructura de auditoría de equidad
