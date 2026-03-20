(function (window) {
  'use strict';

  var ENGINE_VERSION = '1.2.3';
  var MONTO_FINANCIADO_MINIMO = 15000000;
  var MESES_SEGURO_AUTO = 12;
  var TASA_SEGURO_DESEMPLEO = 0.055811;
  var TARIFA_SEGURO_VIDA_POR_MILLON = 1220;
  var PLAZOS_SOPORTADOS = [24, 36, 48, 60, 72, 84];

  function toNum(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : (typeof fallback === 'number' ? fallback : 0);
  }

  function trunc2(n) {
    var value = Number(n) || 0;
    return Math.floor(value * 100) / 100;
  }

  function round2(n) {
    var value = Number(n) || 0;
    return Math.round(value * 100) / 100;
  }

  function clamp(value, min, max) {
    var n = Number(value) || 0;
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizarTasaMensual(valor) {
    if (valor === null || typeof valor === 'undefined' || String(valor).trim() === '') {
      return null;
    }

    var raw = String(valor).trim();
    raw = raw.replace(/\s/g, '').replace('%', '').replace(',', '.');

    var n = Number(raw);
    if (!Number.isFinite(n)) return null;

    if (n >= 2) return n / 100;
    if (n >= 1 && n < 2) return n / 100;
    return n;
  }

  function roundRatePct2ToDecimal(rateDecimal) {
    var n = Number(rateDecimal);
    if (!Number.isFinite(n)) return null;
    return round2(n * 100) / 100;
  }

  function tasaMensualADisplayPorcentaje(tasaMensual) {
    var n = Number(tasaMensual);
    if (!Number.isFinite(n)) return '0.00%';
    return round2(n * 100).toFixed(2) + '%';
  }

  function parseMoneyFlexible(value) {
    if (value === null || typeof value === 'undefined') return 0;

    var raw = String(value).trim();
    if (!raw) return 0;

    raw = raw.replace(/\$/g, '').replace(/\s/g, '');

    if (/^\d+\.\d+$/.test(raw)) {
      return Number(raw) || 0;
    }

    if (/^\d+,\d+$/.test(raw)) {
      return Number(raw.replace(',', '.')) || 0;
    }

    if (/^\d{1,3}(\.\d{3})+,\d+$/.test(raw)) {
      return Number(raw.replace(/\./g, '').replace(',', '.')) || 0;
    }

    if (/^\d{1,3}(,\d{3})+\.\d+$/.test(raw)) {
      return Number(raw.replace(/,/g, '')) || 0;
    }

    if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
      return Number(raw.replace(/\./g, '')) || 0;
    }

    if (/^\d{1,3}(,\d{3})+$/.test(raw)) {
      return Number(raw.replace(/,/g, '')) || 0;
    }

    return Number(raw) || 0;
  }

  function buildConfig(rawConfig) {
    var raw = rawConfig || {};
    var tasasRaw = raw.tasasRaw || {};
    var montoMaximosPorPlazo = raw.montoMaximosPorPlazo || {};

    return {
      clienteId: raw.clienteId || '',
      negocioId: raw.negocioId || '',
      respuestaFinalTesla: raw.respuestaFinalTesla || '',
      valorVehiculo: round2(parseMoneyFlexible(raw.valorVehiculo)),
      valorFinanciar: round2(parseMoneyFlexible(raw.valorFinanciar)),
      cuotaInicialMinimaPerfil: round2(parseMoneyFlexible(raw.cuotaInicialMinimaPerfil)),
      cuotaMaximaPerfil: round2(parseMoneyFlexible(raw.cuotaMaximaPerfil)),
      plazo: toNum(raw.plazo, 0),

      valorSeguroTodoRiesgo: round2(parseMoneyFlexible(
        raw.valorSeguroTodoRiesgoRaw || raw.valorSeguroTodoRiesgo
      )),

      tasasRaw: {
        tasa_0_10: tasasRaw.tasa_0_10 || '',
        tasa_11_20: tasasRaw.tasa_11_20 || '',
        tasa_21_30: tasasRaw.tasa_21_30 || '',
        tasa_31_40: tasasRaw.tasa_31_40 || '',
        tasa_41_50: tasasRaw.tasa_41_50 || '',
        tasa_mayor_50: tasasRaw.tasa_mayor_50 || ''
      },

      tasasNormalizadas: {
        tasa_0_10: normalizarTasaMensual(tasasRaw.tasa_0_10),
        tasa_11_20: normalizarTasaMensual(tasasRaw.tasa_11_20),
        tasa_21_30: normalizarTasaMensual(tasasRaw.tasa_21_30),
        tasa_31_40: normalizarTasaMensual(tasasRaw.tasa_31_40),
        tasa_41_50: normalizarTasaMensual(tasasRaw.tasa_41_50),
        tasa_mayor_50: normalizarTasaMensual(tasasRaw.tasa_mayor_50)
      },

      montoMaximosPorPlazo: {
        24: round2(parseMoneyFlexible(montoMaximosPorPlazo['24'])),
        36: round2(parseMoneyFlexible(montoMaximosPorPlazo['36'])),
        48: round2(parseMoneyFlexible(montoMaximosPorPlazo['48'])),
        60: round2(parseMoneyFlexible(montoMaximosPorPlazo['60'])),
        72: round2(parseMoneyFlexible(montoMaximosPorPlazo['72'])),
        84: round2(parseMoneyFlexible(montoMaximosPorPlazo['84']))
      },

      nodo: toNum(raw.nodo, 0),
      score: toNum(raw.score, 0),
      actividadEconomica: raw.actividadEconomica || '',
      debug: !!raw.debug
    };
  }

  function validarConfiguracion(config) {
    var errors = [];

    if (!config.valorVehiculo || config.valorVehiculo <= 0) {
      errors.push({
        code: 'MISSING_VALOR_VEHICULO',
        message: 'Falta valorVehiculo válido.'
      });
    }

    if (!config.plazo || config.plazo <= 0) {
      errors.push({
        code: 'MISSING_PLAZO',
        message: 'Falta plazo válido.'
      });
    }

    if (!config.valorSeguroTodoRiesgo || config.valorSeguroTodoRiesgo <= 0) {
      errors.push({
        code: 'MISSING_SEGURO_TODO_RIESGO',
        message: 'Falta valorSeguroTodoRiesgo válido.'
      });
    }

    if (!config.respuestaFinalTesla) {
      errors.push({
        code: 'MISSING_RESPUESTA_FINAL',
        message: 'Falta respuestaFinalTesla.'
      });
    }

    var tieneMontoMaximo = false;
    var montoKeys = Object.keys(config.montoMaximosPorPlazo || {});
    for (var j = 0; j < montoKeys.length; j++) {
      if (toNum(config.montoMaximosPorPlazo[montoKeys[j]], 0) > 0) {
        tieneMontoMaximo = true;
        break;
      }
    }

    if (!tieneMontoMaximo) {
      errors.push({
        code: 'MISSING_MONTO_MAX_PLAZO',
        message: 'No existen montos máximos parametrizados por plazo.'
      });
    }

    var existePlazoViable = false;
    for (var i = 0; i < PLAZOS_SOPORTADOS.length; i++) {
      var plazo = PLAZOS_SOPORTADOS[i];
      var montoMaximo = round2(toNum((config.montoMaximosPorPlazo || {})[plazo], 0));
      if (montoMaximo >= MONTO_FINANCIADO_MINIMO) {
        existePlazoViable = true;
        break;
      }
    }

    if (!existePlazoViable) {
      errors.push({
        code: 'NO_HAY_PLAZOS_VIABLES',
        message: 'Ningún plazo cumple con el monto financiado mínimo requerido.'
      });
    }

    return {
      ok: errors.length === 0,
      errors: errors
    };
  }

  function getMontoMaxPorPlazo(config, plazo) {
    var p = Number(plazo);
    var monto = round2(toNum((config.montoMaximosPorPlazo || {})[p], 0));

    if (PLAZOS_SOPORTADOS.indexOf(p) === -1) {
      return {
        ok: false,
        value: 0,
        error: {
          code: 'PLAZO_NO_SOPORTADO',
          message: 'El plazo ' + p + ' no es soportado por el motor.'
        }
      };
    }

    if (p === 84 && monto <= 0) {
      return {
        ok: false,
        value: 0,
        error: {
          code: 'PLAZO_84_NO_PARAMETRIZADO',
          message: '84 meses fue solicitado pero no está parametrizado.'
        }
      };
    }

    if (monto <= 0) {
      return {
        ok: false,
        value: 0,
        error: {
          code: 'PLAZO_SIN_MONTO_MAXIMO',
          message: 'El plazo ' + p + ' no tiene monto máximo parametrizado.'
        }
      };
    }

    return {
      ok: true,
      value: monto
    };
  }

  function getPlazosDisponibles(config) {
    var plazos = [];
    var p;

    for (var i = 0; i < PLAZOS_SOPORTADOS.length; i++) {
      p = PLAZOS_SOPORTADOS[i];
      if (getMontoMaxPorPlazo(config, p).ok) {
        plazos.push(p);
      }
    }

    return plazos;
  }

  function getCuotaMinimaDinamica(config, plazo) {
    var montoMaxResult = getMontoMaxPorPlazo(config, plazo);
    if (!montoMaxResult.ok) {
      return {
        ok: false,
        error: montoMaxResult.error
      };
    }

    var valorVehiculo = round2(toNum(config.valorVehiculo, 0));
    var cuotaMinimaPerfil = round2(toNum(config.cuotaInicialMinimaPerfil, 0));
    var montoMaxPlazo = round2(montoMaxResult.value);

    var cuotaMinimaPorPlazo = 0;
    if (montoMaxPlazo > 0 && valorVehiculo > 0) {
      cuotaMinimaPorPlazo = round2(Math.max(0, valorVehiculo - montoMaxPlazo));
    }

    return {
      ok: true,
      data: {
        valorVehiculo: valorVehiculo,
        cuotaMinimaPerfil: cuotaMinimaPerfil,
        montoMaxPlazo: montoMaxPlazo,
        cuotaMinimaPorPlazo: cuotaMinimaPorPlazo,
        cuotaMinimaFinal: round2(Math.max(cuotaMinimaPerfil, cuotaMinimaPorPlazo))
      }
    };
  }

  function getCuotaMaximaDinamica(config) {
    var valorVehiculo = round2(toNum(config.valorVehiculo, 0));

    return {
      ok: true,
      data: {
        cuotaMaximaPerfilInformativa: round2(toNum(config.cuotaMaximaPerfil, 0)),
        cuotaMaximaPorMontoMinimo: round2(Math.max(0, valorVehiculo - MONTO_FINANCIADO_MINIMO)),
        cuotaMaximaFinal: round2(Math.max(0, valorVehiculo - MONTO_FINANCIADO_MINIMO))
      }
    };
  }

  function getRestriccionesFinales(config, plazo) {
    var minResult = getCuotaMinimaDinamica(config, plazo);
    if (!minResult.ok) return minResult;

    var maxResult = getCuotaMaximaDinamica(config);
    if (!maxResult.ok) return maxResult;

    var minFinal = round2(minResult.data.cuotaMinimaFinal);
    var maxFinal = round2(maxResult.data.cuotaMaximaFinal);

    if (maxFinal < minFinal) {
      maxFinal = minFinal;
    }

    return {
      ok: true,
      data: {
        plazo: Number(plazo),
        montoMaxPlazo: round2(minResult.data.montoMaxPlazo),
        cuotaMinimaPerfil: round2(minResult.data.cuotaMinimaPerfil),
        cuotaMinimaPorPlazo: round2(minResult.data.cuotaMinimaPorPlazo),
        cuotaMinimaFinal: round2(minFinal),
        cuotaMaximaPerfilInformativa: round2(maxResult.data.cuotaMaximaPerfilInformativa),
        cuotaMaximaPorMontoMinimo: round2(maxResult.data.cuotaMaximaPorMontoMinimo),
        cuotaMaximaFinal: round2(maxFinal)
      }
    };
  }

  function getTasaAplicableFallback(config, cuotaInicial, valorVehiculo) {
    if (!valorVehiculo || valorVehiculo <= 0) {
      return {
        ok: false,
        error: {
          code: 'VALOR_VEHICULO_INVALIDO',
          message: 'No se puede obtener tasa sin valorVehiculo válido.'
        }
      };
    }

    var porcentaje = round2((cuotaInicial / valorVehiculo) * 100);
    var tasa = null;
    var bucket = '';

    if (porcentaje <= 10) {
      tasa = config.tasasNormalizadas.tasa_0_10;
      bucket = '0-10';
    } else if (porcentaje <= 20) {
      tasa = config.tasasNormalizadas.tasa_11_20;
      bucket = '11-20';
    } else if (porcentaje <= 30) {
      tasa = config.tasasNormalizadas.tasa_21_30;
      bucket = '21-30';
    } else if (porcentaje <= 40) {
      tasa = config.tasasNormalizadas.tasa_31_40;
      bucket = '31-40';
    } else if (porcentaje <= 50) {
      tasa = config.tasasNormalizadas.tasa_41_50;
      bucket = '41-50';
    } else {
      tasa = config.tasasNormalizadas.tasa_mayor_50;
      bucket = '>50';
    }

    if (!Number.isFinite(tasa)) {
      return {
        ok: false,
        error: {
          code: 'TASA_INVALIDA_BUCKET',
          message: 'La tasa del bucket ' + bucket + ' no es válida.'
        }
      };
    }

    var tasaRedondeada = roundRatePct2ToDecimal(tasa);
    var tasaEaRedondeada = roundRatePct2ToDecimal(Math.pow(1 + tasaRedondeada, 12) - 1);

    return {
      ok: true,
      data: {
        rateSource: 'fallback_bucket_table',
        porcentajeCuotaInicial: porcentaje,
        bucket: bucket,
        bucketCuotaPm: null,
        bucketScorePm: null,
        probabilidadMora: null,
        motivoTasaFinal: 'Fallback por tabla parametrizada',
        tasaRaw: (function () {
          if (bucket === '0-10') return config.tasasRaw.tasa_0_10;
          if (bucket === '11-20') return config.tasasRaw.tasa_11_20;
          if (bucket === '21-30') return config.tasasRaw.tasa_21_30;
          if (bucket === '31-40') return config.tasasRaw.tasa_31_40;
          if (bucket === '41-50') return config.tasasRaw.tasa_41_50;
          return config.tasasRaw.tasa_mayor_50;
        })(),
        tasaNormalizada: tasaRedondeada,
        tasaMostrada: tasaMensualADisplayPorcentaje(tasaRedondeada),
        tasaFinalEA: tasaEaRedondeada,
        ratePolicyResult: null
      }
    };
  }

  function resolverTasaDesdePolicy(config, cuotaInicial, plazo, incluirAuto, incluirDesempleo) {
    if (!window.TeslaRatePolicy || typeof window.TeslaRatePolicy.calculateRate !== 'function') {
      return {
        ok: false,
        error: {
          code: 'RATE_POLICY_UNAVAILABLE',
          message: 'No se encontró TeslaRatePolicy.calculateRate.'
        }
      };
    }

    var payload = {
      nodo_tesla: config.nodo,
      score_tesla: config.score,
      plazo_tesla: plazo,
      actividad_economica_tesla: config.actividadEconomica,
      valor_vehiculo_final_tesla: round2(config.valorVehiculo),
      cuota_inicial_seleccionada_tesla: round2(cuotaInicial),
      monto_max_24_tesla: round2(toNum(config.montoMaximosPorPlazo[24], 0)),
      monto_max_36_tesla: round2(toNum(config.montoMaximosPorPlazo[36], 0)),
      monto_max_48_tesla: round2(toNum(config.montoMaximosPorPlazo[48], 0)),
      monto_max_60_tesla: round2(toNum(config.montoMaximosPorPlazo[60], 0)),
      monto_max_72_tesla: round2(toNum(config.montoMaximosPorPlazo[72], 0)),
      monto_max_84_tesla: round2(toNum(config.montoMaximosPorPlazo[84], 0)),
      cuota_inicial_minima_tesla: round2(toNum(config.cuotaInicialMinimaPerfil, 0)),
      seguro_desempleo_tesla: !!incluirDesempleo,
      seguro_todo_riesgo_tesla: !!incluirAuto
    };

    var result = window.TeslaRatePolicy.calculateRate(payload);

    if (!result || result.status !== 'OK' || !result.data || !Number.isFinite(Number(result.data.tasa_final_nmv))) {
      return {
        ok: false,
        error: {
          code: (result && result.error_code) || 'RATE_POLICY_ERROR',
          message: (result && result.mensaje_error) || 'El motor de tasa no devolvió una tasa válida.',
          detail: result || null
        }
      };
    }

    var data = result.data;
    var tasaNmv = Number(data.tasa_final_nmv);
    var tasaEa = Number(data.tasa_final_ea);

    return {
      ok: true,
      data: {
        rateSource: 'rate_policy',
        porcentajeCuotaInicial: round2(Number(data.porcentaje_cuota_inicial)),
        bucket: null,
        bucketCuotaPm: data.bucket_cuota_pm || null,
        bucketScorePm: data.bucket_score_pm || null,
        probabilidadMora: Number.isFinite(Number(data.probabilidad_mora)) ? round2(Number(data.probabilidad_mora)) : null,
        motivoTasaFinal: data.motivo_tasa_final || '',
        tasaRaw: '',
        tasaNormalizada: roundRatePct2ToDecimal(tasaNmv),
        tasaMostrada: tasaMensualADisplayPorcentaje(roundRatePct2ToDecimal(tasaNmv)),
        tasaFinalEA: Number.isFinite(tasaEa) ? roundRatePct2ToDecimal(tasaEa) : null,
        ratePolicyResult: deepClone(result)
      }
    };
  }

  function resolverTasa(config, cuotaInicial, plazo, incluirAuto, incluirDesempleo) {
    var policyResult = resolverTasaDesdePolicy(
      config,
      cuotaInicial,
      plazo,
      incluirAuto,
      incluirDesempleo
    );

    if (policyResult.ok) {
      return policyResult;
    }

    var fallbackResult = getTasaAplicableFallback(config, cuotaInicial, config.valorVehiculo);
    if (fallbackResult.ok) {
      fallbackResult.data.ratePolicyResult = {
        status: 'ERROR',
        error: policyResult.error.code,
        message: policyResult.error.message,
        detail: policyResult.error.detail || null
      };
      return fallbackResult;
    }

    return policyResult;
  }

  function calcularCuotaBase(capital, tasaMensual, plazo) {
    var i = Number(tasaMensual) || 0;
    var n = Number(plazo) || 0;

    if (n <= 0) return 0;
    if (i === 0) return capital / n;

    var factor = Math.pow(1 + i, n);
    return capital * ((i * factor) / (factor - 1));
  }

  function validarSanidadSeguros(config, calculation) {
    var warnings = [];

    if (calculation.seguros.valorSeguroAuto > config.valorVehiculo * 0.1) {
      warnings.push({
        code: 'SEGURO_AUTO_OUTLIER',
        message: 'El seguro auto mensual luce desproporcionado frente al valor del vehículo.',
        valorSeguroAuto: calculation.seguros.valorSeguroAuto,
        valorVehiculo: config.valorVehiculo
      });
    }

    if (calculation.seguros.valorSeguroAuto > calculation.cuotaBase * 3) {
      warnings.push({
        code: 'SEGURO_AUTO_SUPERA_MULTIPLO_CUOTA_BASE',
        message: 'El seguro auto mensual supera ampliamente la cuota base.',
        valorSeguroAuto: calculation.seguros.valorSeguroAuto,
        cuotaBase: calculation.cuotaBase
      });
    }

    if (calculation.seguros.valorSeguroAuto > 2000000) {
      warnings.push({
        code: 'SEGURO_AUTO_MENSUAL_ATIPICO',
        message: 'El seguro auto mensual supera un umbral técnico de revisión.',
        valorSeguroAuto: calculation.seguros.valorSeguroAuto
      });
    }

    return warnings;
  }

  function calcularOferta(config, input) {
    var plazo = toNum(input.plazo, config.plazo);

    var restriccionesResult = getRestriccionesFinales(config, plazo);
    if (!restriccionesResult.ok) return restriccionesResult;

    var restricciones = restriccionesResult.data;
    var cuotaInicial = round2(clamp(
      toNum(input.cuotaInicial, restricciones.cuotaMinimaFinal),
      restricciones.cuotaMinimaFinal,
      restricciones.cuotaMaximaFinal
    ));

    var valorVehiculo = round2(toNum(config.valorVehiculo, 0));
    var valorFinanciado = round2(Math.max(0, valorVehiculo - cuotaInicial));

    if (valorFinanciado < MONTO_FINANCIADO_MINIMO) {
      return {
        ok: false,
        error: {
          code: 'CAPITAL_FINANCIADO_MENOR_MINIMO',
          message: 'El capital financiado quedó por debajo del mínimo permitido.'
        }
      };
    }

    var incluirAuto = !!input.incluirSeguroAuto;
    var incluirDesempleo = !!input.incluirSeguroDesempleo;

    var tasaResult = resolverTasa(
      config,
      cuotaInicial,
      plazo,
      incluirAuto,
      incluirDesempleo
    );

    if (!tasaResult.ok) {
      return tasaResult;
    }

    var tasaCalculo = roundRatePct2ToDecimal(tasaResult.data.tasaNormalizada);

    var cuotaBase = round2(calcularCuotaBase(
      valorFinanciado,
      tasaCalculo,
      plazo
    ));

    var seguroVida = round2((valorFinanciado / 1000000) * TARIFA_SEGURO_VIDA_POR_MILLON);

    var seguroAuto = incluirAuto
      ? round2(toNum(config.valorSeguroTodoRiesgo, 0) / MESES_SEGURO_AUTO)
      : 0;

    var baseDesempleo = round2(cuotaBase + seguroVida + seguroAuto);

    var seguroDesempleo = incluirDesempleo
      ? round2(baseDesempleo * TASA_SEGURO_DESEMPLEO)
      : 0;

    var cuotaTotal = round2(cuotaBase + seguroVida + seguroAuto + seguroDesempleo);

    var calculation = {
      engineVersion: ENGINE_VERSION,
      restricciones: {
        plazo: Number(restricciones.plazo),
        montoMaxPlazo: round2(restricciones.montoMaxPlazo),
        cuotaMinimaPerfil: round2(restricciones.cuotaMinimaPerfil),
        cuotaMinimaPorPlazo: round2(restricciones.cuotaMinimaPorPlazo),
        cuotaMinimaFinal: round2(restricciones.cuotaMinimaFinal),
        cuotaMaximaPerfilInformativa: round2(restricciones.cuotaMaximaPerfilInformativa),
        cuotaMaximaPorMontoMinimo: round2(restricciones.cuotaMaximaPorMontoMinimo),
        cuotaMaximaFinal: round2(restricciones.cuotaMaximaFinal)
      },
      valorVehiculo: round2(valorVehiculo),
      cuotaInicial: round2(cuotaInicial),
      porcentajeCuotaInicial: round2(tasaResult.data.porcentajeCuotaInicial),
      plazo: Number(plazo),
      capitalFinanciado: round2(valorFinanciado),

      rateSource: tasaResult.data.rateSource || 'unknown',
      ratePolicyResult: tasaResult.data.ratePolicyResult || null,

      tasaBucket: tasaResult.data.bucket,
      bucketCuotaPm: tasaResult.data.bucketCuotaPm,
      bucketScorePm: tasaResult.data.bucketScorePm,
      probabilidadMora: tasaResult.data.probabilidadMora,
      motivoTasaFinal: tasaResult.data.motivoTasaFinal,

      tasaRaw: tasaResult.data.tasaRaw,
      tasaNormalizada: tasaCalculo,
      tasaMostrada: tasaMensualADisplayPorcentaje(tasaCalculo),
      tasaFinalEA: tasaResult.data.tasaFinalEA !== null ? roundRatePct2ToDecimal(tasaResult.data.tasaFinalEA) : null,

      seguros: {
        autoSeleccionado: incluirAuto,
        desempleoSeleccionado: incluirDesempleo,
        valorSeguroVida: round2(seguroVida),
        valorSeguroAuto: round2(seguroAuto),
        valorSeguroDesempleo: round2(seguroDesempleo)
      },
      cuotaBase: round2(cuotaBase),
      cuotaTotal: round2(cuotaTotal)
    };

    calculation.warnings = validarSanidadSeguros(config, calculation);

    return {
      ok: true,
      data: calculation
    };
  }

  window.TeslaPricingEngine = {
    version: ENGINE_VERSION,
    constants: {
      MONTO_FINANCIADO_MINIMO: MONTO_FINANCIADO_MINIMO,
      MESES_SEGURO_AUTO: MESES_SEGURO_AUTO,
      TASA_SEGURO_DESEMPLEO: TASA_SEGURO_DESEMPLEO,
      TARIFA_SEGURO_VIDA_POR_MILLON: TARIFA_SEGURO_VIDA_POR_MILLON,
      PLAZOS_SOPORTADOS: deepClone(PLAZOS_SOPORTADOS)
    },
    utils: {
      toNum: toNum,
      trunc2: trunc2,
      round2: round2,
      roundRatePct2ToDecimal: roundRatePct2ToDecimal,
      clamp: clamp,
      deepClone: deepClone,
      normalizarTasaMensual: normalizarTasaMensual,
      tasaMensualADisplayPorcentaje: tasaMensualADisplayPorcentaje,
      parseMoneyFlexible: parseMoneyFlexible
    },
    buildConfig: buildConfig,
    validarConfiguracion: validarConfiguracion,
    getPlazosDisponibles: getPlazosDisponibles,
    getMontoMaxPorPlazo: getMontoMaxPorPlazo,
    getCuotaMinimaDinamica: getCuotaMinimaDinamica,
    getCuotaMaximaDinamica: getCuotaMaximaDinamica,
    getRestriccionesFinales: getRestriccionesFinales,
    getTasaAplicableFallback: getTasaAplicableFallback,
    resolverTasaDesdePolicy: resolverTasaDesdePolicy,
    resolverTasa: resolverTasa,
    validarSanidadSeguros: validarSanidadSeguros,
    calcularOferta: calcularOferta
  };
})(window);