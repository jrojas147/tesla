(function (window) {
  'use strict';

  var ENGINE_VERSION = '1.2.0';
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

  function tasaMensualADisplayPorcentaje(tasaMensual) {
    var n = Number(tasaMensual);
    if (!Number.isFinite(n)) return '0.00%';
    return trunc2(n * 100).toFixed(2) + '%';
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
      valorVehiculo: parseMoneyFlexible(raw.valorVehiculo),
      valorFinanciar: parseMoneyFlexible(raw.valorFinanciar),
      cuotaInicialMinimaPerfil: parseMoneyFlexible(raw.cuotaInicialMinimaPerfil),
      cuotaMaximaPerfil: parseMoneyFlexible(raw.cuotaMaximaPerfil),
      plazo: toNum(raw.plazo, 0),

      valorSeguroTodoRiesgo: parseMoneyFlexible(
        raw.valorSeguroTodoRiesgoRaw || raw.valorSeguroTodoRiesgo
      ),

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
        24: parseMoneyFlexible(montoMaximosPorPlazo['24']),
        36: parseMoneyFlexible(montoMaximosPorPlazo['36']),
        48: parseMoneyFlexible(montoMaximosPorPlazo['48']),
        60: parseMoneyFlexible(montoMaximosPorPlazo['60']),
        72: parseMoneyFlexible(montoMaximosPorPlazo['72']),
        84: parseMoneyFlexible(montoMaximosPorPlazo['84'])
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

    return {
      ok: errors.length === 0,
      errors: errors
    };
  }

  function getMontoMaxPorPlazo(config, plazo) {
    var p = Number(plazo);
    var monto = toNum((config.montoMaximosPorPlazo || {})[p], 0);

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

    var valorVehiculo = toNum(config.valorVehiculo, 0);
    var cuotaMinimaPerfil = toNum(config.cuotaInicialMinimaPerfil, 0);
    var montoMaxPlazo = montoMaxResult.value;

    var cuotaMinimaPorPlazo = 0;
    if (montoMaxPlazo > 0 && valorVehiculo > 0) {
      cuotaMinimaPorPlazo = Math.max(0, valorVehiculo - montoMaxPlazo);
    }

    return {
      ok: true,
      data: {
        valorVehiculo: valorVehiculo,
        cuotaMinimaPerfil: cuotaMinimaPerfil,
        montoMaxPlazo: montoMaxPlazo,
        cuotaMinimaPorPlazo: cuotaMinimaPorPlazo,
        cuotaMinimaFinal: Math.max(cuotaMinimaPerfil, cuotaMinimaPorPlazo)
      }
    };
  }

  function getCuotaMaximaDinamica(config) {
    var valorVehiculo = toNum(config.valorVehiculo, 0);

    return {
      ok: true,
      data: {
        cuotaMaximaPerfilInformativa: toNum(config.cuotaMaximaPerfil, 0),
        cuotaMaximaPorMontoMinimo: Math.max(0, valorVehiculo - MONTO_FINANCIADO_MINIMO),
        cuotaMaximaFinal: Math.max(0, valorVehiculo - MONTO_FINANCIADO_MINIMO)
      }
    };
  }

  function getRestriccionesFinales(config, plazo) {
    var minResult = getCuotaMinimaDinamica(config, plazo);
    if (!minResult.ok) return minResult;

    var maxResult = getCuotaMaximaDinamica(config);
    if (!maxResult.ok) return maxResult;

    var minFinal = minResult.data.cuotaMinimaFinal;
    var maxFinal = maxResult.data.cuotaMaximaFinal;

    if (maxFinal < minFinal) {
      maxFinal = minFinal;
    }

    return {
      ok: true,
      data: {
        plazo: Number(plazo),
        montoMaxPlazo: minResult.data.montoMaxPlazo,
        cuotaMinimaPerfil: minResult.data.cuotaMinimaPerfil,
        cuotaMinimaPorPlazo: minResult.data.cuotaMinimaPorPlazo,
        cuotaMinimaFinal: minFinal,
        cuotaMaximaPerfilInformativa: maxResult.data.cuotaMaximaPerfilInformativa,
        cuotaMaximaPorMontoMinimo: maxResult.data.cuotaMaximaPorMontoMinimo,
        cuotaMaximaFinal: maxFinal
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

    var porcentaje = (cuotaInicial / valorVehiculo) * 100;
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
        tasaNormalizada: tasa,
        tasaMostrada: tasaMensualADisplayPorcentaje(tasa),
        tasaFinalEA: Math.pow(1 + tasa, 12) - 1,
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
      valor_vehiculo_final_tesla: config.valorVehiculo,
      cuota_inicial_seleccionada_tesla: cuotaInicial,
      monto_max_24_tesla: toNum(config.montoMaximosPorPlazo[24], 0),
      monto_max_36_tesla: toNum(config.montoMaximosPorPlazo[36], 0),
      monto_max_48_tesla: toNum(config.montoMaximosPorPlazo[48], 0),
      monto_max_60_tesla: toNum(config.montoMaximosPorPlazo[60], 0),
      monto_max_72_tesla: toNum(config.montoMaximosPorPlazo[72], 0),
      monto_max_84_tesla: toNum(config.montoMaximosPorPlazo[84], 0),
      cuota_inicial_minima_tesla: toNum(config.cuotaInicialMinimaPerfil, 0),
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

    return {
      ok: true,
      data: {
        rateSource: 'rate_policy',
        porcentajeCuotaInicial: Number(data.porcentaje_cuota_inicial),
        bucket: null,
        bucketCuotaPm: data.bucket_cuota_pm || null,
        bucketScorePm: data.bucket_score_pm || null,
        probabilidadMora: Number.isFinite(Number(data.probabilidad_mora)) ? Number(data.probabilidad_mora) : null,
        motivoTasaFinal: data.motivo_tasa_final || '',
        tasaRaw: '',
        tasaNormalizada: Number(data.tasa_final_nmv),
        tasaMostrada: tasaMensualADisplayPorcentaje(Number(data.tasa_final_nmv)),
        tasaFinalEA: Number.isFinite(Number(data.tasa_final_ea)) ? Number(data.tasa_final_ea) : null,
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
    var cuotaInicial = clamp(
      toNum(input.cuotaInicial, restricciones.cuotaMinimaFinal),
      restricciones.cuotaMinimaFinal,
      restricciones.cuotaMaximaFinal
    );

    var valorVehiculo = toNum(config.valorVehiculo, 0);
    var valorFinanciado = Math.max(0, valorVehiculo - cuotaInicial);

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

    var cuotaBase = calcularCuotaBase(
      valorFinanciado,
      tasaResult.data.tasaNormalizada,
      plazo
    );

    var seguroVida = (valorFinanciado / 1000000) * TARIFA_SEGURO_VIDA_POR_MILLON;
    var seguroAuto = incluirAuto
      ? (toNum(config.valorSeguroTodoRiesgo, 0) / MESES_SEGURO_AUTO)
      : 0;

    var baseDesempleo = cuotaBase + seguroVida + seguroAuto;
    var seguroDesempleo = incluirDesempleo
      ? (baseDesempleo * TASA_SEGURO_DESEMPLEO)
      : 0;

    var cuotaTotal = cuotaBase + seguroVida + seguroAuto + seguroDesempleo;

    var calculation = {
      engineVersion: ENGINE_VERSION,
      restricciones: deepClone(restricciones),
      valorVehiculo: valorVehiculo,
      cuotaInicial: cuotaInicial,
      porcentajeCuotaInicial: tasaResult.data.porcentajeCuotaInicial,
      plazo: plazo,
      capitalFinanciado: valorFinanciado,

      rateSource: tasaResult.data.rateSource || 'unknown',
      ratePolicyResult: tasaResult.data.ratePolicyResult || null,

      tasaBucket: tasaResult.data.bucket,
      bucketCuotaPm: tasaResult.data.bucketCuotaPm,
      bucketScorePm: tasaResult.data.bucketScorePm,
      probabilidadMora: tasaResult.data.probabilidadMora,
      motivoTasaFinal: tasaResult.data.motivoTasaFinal,

      tasaRaw: tasaResult.data.tasaRaw,
      tasaNormalizada: tasaResult.data.tasaNormalizada,
      tasaMostrada: tasaResult.data.tasaMostrada,
      tasaFinalEA: tasaResult.data.tasaFinalEA,

      seguros: {
        autoSeleccionado: incluirAuto,
        desempleoSeleccionado: incluirDesempleo,
        valorSeguroVida: seguroVida,
        valorSeguroAuto: seguroAuto,
        valorSeguroDesempleo: seguroDesempleo
      },
      cuotaBase: cuotaBase,
      cuotaTotal: cuotaTotal
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