(function (window) {
  'use strict';

  var VERSION = '1.1.0';

  var CONFIG = {
    commercialDiscountLifeNMV: 0.0005,
    commercialDiscountEvNMV: 0.0003,
    unemploymentInsuranceDiscountNMV: 0.0003,
    allRiskInsuranceDiscountNMV: 0.0002,
    fixedHighScoreNMV: 0.0124,
    highScoreThreshold: 950,
    fundingScoreThreshold: 800,

    allowedTerms: [24, 36, 48, 60, 72],

    minFinancedAmount: 15000000,

    fundingCostByTerm: {
      24: 0.0106,
      36: 0.0107,
      48: 0.0108,
      60: 0.0108,
      72: 0.0108
    },

    fundingCostByTermLowScore: {
      24: 0.0099,
      36: 0.0101,
      48: 0.0101,
      60: 0.0101,
      72: 0.0101
    },

    profitabilityByNode: {
      1: 0.0017,
      2: 0.0030,
      3: 0.0035,
      4: 0.0038,
      5: 0.0038,
      6: 0.0040,
      7: 0.0040,
      8: 0.0040,
      9: 0.0048,
      10: 0.0048,
      11: 0.0048,
      12: 0.0048,
      13: 0.0048
    },

    ceilingAdjustmentByNode: {
      1: 0.0025,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: 0,
      10: 0,
      11: 0,
      12: 0,
      13: 0
    },

    feeDealerNMV: 0,
    operatingCostAnnual: 0.007,
    icaAnnual: 0.005,
    independentActivityAnnual: 0.012,
    riskInitialAnnual: 0.01,
    usuryAnnual: 0.2295,
    usuryAnnualLowScore: 0.2271,
    floorMonthlyNMV: 0.0123
  };

  var SCORE_BUCKETS = [
    { label: '0 - 501', min: 0, max: 501 },
    { label: '502 - 573', min: 502, max: 573 },
    { label: '574 - 607', min: 574, max: 607 },
    { label: '608 - 671', min: 608, max: 671 },
    { label: '672 - 735', min: 672, max: 735 },
    { label: '736 - 799', min: 736, max: 799 },
    { label: '800 - 904', min: 800, max: 904 },
    { label: '905 - 949', min: 905, max: 949 },
    { label: '950 - 959', min: 950, max: 959 },
    { label: '960 - 969', min: 960, max: 969 },
    { label: '970 - 979', min: 970, max: 979 },
    { label: '980 - 1000', min: 980, max: 1000 }
  ];

  var PRODUCTIVE_PM_MATRIX = [
    { bucketCuota: '0 a 10%', bucketScore: '0 - 501', Empleado: 0.7621, Independiente: 0.7621 },
    { bucketCuota: '0 a 10%', bucketScore: '502 - 573', Empleado: 0.7621, Independiente: 0.7621 },
    { bucketCuota: '0 a 10%', bucketScore: '574 - 607', Empleado: 0.7621, Independiente: 0.7621 },
    { bucketCuota: '0 a 10%', bucketScore: '608 - 671', Empleado: 0.7621, Independiente: 0.7621 },
    { bucketCuota: '0 a 10%', bucketScore: '672 - 735', Empleado: 0.6214, Independiente: 0.6214 },
    { bucketCuota: '0 a 10%', bucketScore: '736 - 799', Empleado: 0.4957, Independiente: 0.4957 },
    { bucketCuota: '0 a 10%', bucketScore: '800 - 904', Empleado: 0.3132, Independiente: 0.3132 },
    { bucketCuota: '0 a 10%', bucketScore: '905 - 949', Empleado: 0.1969, Independiente: 0.2068 },
    { bucketCuota: '0 a 10%', bucketScore: '950 - 959', Empleado: 0.1652, Independiente: 0.1693 },
    { bucketCuota: '0 a 10%', bucketScore: '960 - 969', Empleado: 0.1539, Independiente: 0.1585 },
    { bucketCuota: '0 a 10%', bucketScore: '970 - 979', Empleado: 0.1242, Independiente: 0.1242 },
    { bucketCuota: '0 a 10%', bucketScore: '980 - 1000', Empleado: 0.1242, Independiente: 0.1242 },

    { bucketCuota: '11% a 20%', bucketScore: '0 - 501', Empleado: 0.7409, Independiente: 0.7409 },
    { bucketCuota: '11% a 20%', bucketScore: '502 - 573', Empleado: 0.7409, Independiente: 0.7409 },
    { bucketCuota: '11% a 20%', bucketScore: '574 - 607', Empleado: 0.7409, Independiente: 0.7409 },
    { bucketCuota: '11% a 20%', bucketScore: '608 - 671', Empleado: 0.7409, Independiente: 0.7409 },
    { bucketCuota: '11% a 20%', bucketScore: '672 - 735', Empleado: 0.5667, Independiente: 0.5750 },
    { bucketCuota: '11% a 20%', bucketScore: '736 - 799', Empleado: 0.4562, Independiente: 0.4562 },
    { bucketCuota: '11% a 20%', bucketScore: '800 - 904', Empleado: 0.2462, Independiente: 0.2643 },
    { bucketCuota: '11% a 20%', bucketScore: '905 - 949', Empleado: 0.1413, Independiente: 0.1724 },
    { bucketCuota: '11% a 20%', bucketScore: '950 - 959', Empleado: 0.1256, Independiente: 0.1264 },
    { bucketCuota: '11% a 20%', bucketScore: '960 - 969', Empleado: 0.1145, Independiente: 0.1145 },
    { bucketCuota: '11% a 20%', bucketScore: '970 - 979', Empleado: 0.0746, Independiente: 0.0867 },
    { bucketCuota: '11% a 20%', bucketScore: '980 - 1000', Empleado: 0.0746, Independiente: 0.0867 },

    { bucketCuota: '21% a 30%', bucketScore: '0 - 501', Empleado: 0.7402, Independiente: 0.7402 },
    { bucketCuota: '21% a 30%', bucketScore: '502 - 573', Empleado: 0.7402, Independiente: 0.7402 },
    { bucketCuota: '21% a 30%', bucketScore: '574 - 607', Empleado: 0.7402, Independiente: 0.7402 },
    { bucketCuota: '21% a 30%', bucketScore: '608 - 671', Empleado: 0.6649, Independiente: 0.6658 },
    { bucketCuota: '21% a 30%', bucketScore: '672 - 735', Empleado: 0.5303, Independiente: 0.5303 },
    { bucketCuota: '21% a 30%', bucketScore: '736 - 799', Empleado: 0.3896, Independiente: 0.3923 },
    { bucketCuota: '21% a 30%', bucketScore: '800 - 904', Empleado: 0.1969, Independiente: 0.2273 },
    { bucketCuota: '21% a 30%', bucketScore: '905 - 949', Empleado: 0.1159, Independiente: 0.1175 },
    { bucketCuota: '21% a 30%', bucketScore: '950 - 959', Empleado: 0.0968, Independiente: 0.1031 },
    { bucketCuota: '21% a 30%', bucketScore: '960 - 969', Empleado: 0.0908, Independiente: 0.0908 },
    { bucketCuota: '21% a 30%', bucketScore: '970 - 979', Empleado: 0.0693, Independiente: 0.0871 },
    { bucketCuota: '21% a 30%', bucketScore: '980 - 1000', Empleado: 0.0627, Independiente: 0.0627 },

    { bucketCuota: '41% a 50%', bucketScore: '0 - 501', Empleado: 0.7238, Independiente: 0.7718 },
    { bucketCuota: '41% a 50%', bucketScore: '502 - 573', Empleado: 0.7238, Independiente: 0.7718 },
    { bucketCuota: '41% a 50%', bucketScore: '574 - 607', Empleado: 0.7589, Independiente: 0.7589 },
    { bucketCuota: '41% a 50%', bucketScore: '608 - 671', Empleado: 0.6198, Independiente: 0.6198 },
    { bucketCuota: '41% a 50%', bucketScore: '672 - 735', Empleado: 0.4604, Independiente: 0.4663 },
    { bucketCuota: '41% a 50%', bucketScore: '736 - 799', Empleado: 0.3210, Independiente: 0.3346 },
    { bucketCuota: '41% a 50%', bucketScore: '800 - 904', Empleado: 0.1566, Independiente: 0.1749 },
    { bucketCuota: '41% a 50%', bucketScore: '905 - 949', Empleado: 0.0925, Independiente: 0.0966 },
    { bucketCuota: '41% a 50%', bucketScore: '950 - 959', Empleado: 0.0777, Independiente: 0.0799 },
    { bucketCuota: '41% a 50%', bucketScore: '960 - 969', Empleado: 0.0638, Independiente: 0.0741 },
    { bucketCuota: '41% a 50%', bucketScore: '970 - 979', Empleado: 0.0612, Independiente: 0.0642 },
    { bucketCuota: '41% a 50%', bucketScore: '980 - 1000', Empleado: 0.0612, Independiente: 0.0642 },

    { bucketCuota: '51% a 60%', bucketScore: '0 - 501', Empleado: 0.7706, Independiente: 0.7706 },
    { bucketCuota: '51% a 60%', bucketScore: '502 - 573', Empleado: 0.7706, Independiente: 0.7706 },
    { bucketCuota: '51% a 60%', bucketScore: '574 - 607', Empleado: 0.6325, Independiente: 0.6961 },
    { bucketCuota: '51% a 60%', bucketScore: '608 - 671', Empleado: 0.5771, Independiente: 0.5771 },
    { bucketCuota: '51% a 60%', bucketScore: '672 - 735', Empleado: 0.4233, Independiente: 0.4233 },
    { bucketCuota: '51% a 60%', bucketScore: '736 - 799', Empleado: 0.2602, Independiente: 0.2705 },
    { bucketCuota: '51% a 60%', bucketScore: '800 - 904', Empleado: 0.1205, Independiente: 0.1383 },
    { bucketCuota: '51% a 60%', bucketScore: '905 - 949', Empleado: 0.0733, Independiente: 0.0774 },
    { bucketCuota: '51% a 60%', bucketScore: '950 - 959', Empleado: 0.0589, Independiente: 0.0660 },
    { bucketCuota: '51% a 60%', bucketScore: '960 - 969', Empleado: 0.0537, Independiente: 0.0566 },
    { bucketCuota: '51% a 60%', bucketScore: '970 - 979', Empleado: 0.0479, Independiente: 0.0512 },
    { bucketCuota: '51% a 60%', bucketScore: '980 - 1000', Empleado: 0.0554, Independiente: 0.0554 },

    { bucketCuota: '61% a 70%', bucketScore: '0 - 501', Empleado: 0.5619, Independiente: 0.5619 },
    { bucketCuota: '61% a 70%', bucketScore: '502 - 573', Empleado: 0.5619, Independiente: 0.5619 },
    { bucketCuota: '61% a 70%', bucketScore: '574 - 607', Empleado: 0.6773, Independiente: 0.7139 },
    { bucketCuota: '61% a 70%', bucketScore: '608 - 671', Empleado: 0.5831, Independiente: 0.5831 },
    { bucketCuota: '61% a 70%', bucketScore: '672 - 735', Empleado: 0.3869, Independiente: 0.3869 },
    { bucketCuota: '61% a 70%', bucketScore: '736 - 799', Empleado: 0.2585, Independiente: 0.2622 },
    { bucketCuota: '61% a 70%', bucketScore: '800 - 904', Empleado: 0.1147, Independiente: 0.1350 },
    { bucketCuota: '61% a 70%', bucketScore: '905 - 949', Empleado: 0.0672, Independiente: 0.0746 },
    { bucketCuota: '61% a 70%', bucketScore: '950 - 959', Empleado: 0.0567, Independiente: 0.0567 },
    { bucketCuota: '61% a 70%', bucketScore: '960 - 969', Empleado: 0.0517, Independiente: 0.0652 },
    { bucketCuota: '61% a 70%', bucketScore: '970 - 979', Empleado: 0.0528, Independiente: 0.0625 },
    { bucketCuota: '61% a 70%', bucketScore: '980 - 1000', Empleado: 0.0434, Independiente: 0.0434 },

    { bucketCuota: '71% a 80%', bucketScore: '0 - 501', Empleado: 0.5564, Independiente: 0.5564 },
    { bucketCuota: '71% a 80%', bucketScore: '502 - 573', Empleado: 0.5564, Independiente: 0.5564 },
    { bucketCuota: '71% a 80%', bucketScore: '574 - 607', Empleado: 0.5891, Independiente: 0.5891 },
    { bucketCuota: '71% a 80%', bucketScore: '608 - 671', Empleado: 0.5022, Independiente: 0.5696 },
    { bucketCuota: '71% a 80%', bucketScore: '672 - 735', Empleado: 0.3499, Independiente: 0.3499 },
    { bucketCuota: '71% a 80%', bucketScore: '736 - 799', Empleado: 0.2102, Independiente: 0.2496 },
    { bucketCuota: '71% a 80%', bucketScore: '800 - 904', Empleado: 0.0980, Independiente: 0.1097 },
    { bucketCuota: '71% a 80%', bucketScore: '905 - 949', Empleado: 0.0551, Independiente: 0.0620 },
    { bucketCuota: '71% a 80%', bucketScore: '950 - 959', Empleado: 0.0403, Independiente: 0.0457 },
    { bucketCuota: '71% a 80%', bucketScore: '960 - 969', Empleado: 0.0412, Independiente: 0.0560 },
    { bucketCuota: '71% a 80%', bucketScore: '970 - 979', Empleado: 0.0379, Independiente: 0.0379 },
    { bucketCuota: '71% a 80%', bucketScore: '980 - 1000', Empleado: 0.0274, Independiente: 0.0274 },

    { bucketCuota: 'Mayor a 80%', bucketScore: '0 - 501', Empleado: 0.5132, Independiente: 0.5132 },
    { bucketCuota: 'Mayor a 80%', bucketScore: '502 - 573', Empleado: 0.5132, Independiente: 0.5132 },
    { bucketCuota: 'Mayor a 80%', bucketScore: '574 - 607', Empleado: 0.5132, Independiente: 0.5132 },
    { bucketCuota: 'Mayor a 80%', bucketScore: '608 - 671', Empleado: 0.5132, Independiente: 0.5132 },
    { bucketCuota: 'Mayor a 80%', bucketScore: '672 - 735', Empleado: 0.2231, Independiente: 0.2395 },
    { bucketCuota: 'Mayor a 80%', bucketScore: '736 - 799', Empleado: 0.1629, Independiente: 0.2522 },
    { bucketCuota: 'Mayor a 80%', bucketScore: '800 - 904', Empleado: 0.0776, Independiente: 0.0918 },
    { bucketCuota: 'Mayor a 80%', bucketScore: '905 - 949', Empleado: 0.0493, Independiente: 0.0493 },
    { bucketCuota: 'Mayor a 80%', bucketScore: '950 - 959', Empleado: 0.0366, Independiente: 0.0366 },
    { bucketCuota: 'Mayor a 80%', bucketScore: '960 - 969', Empleado: 0.0332, Independiente: 0.0332 },
    { bucketCuota: 'Mayor a 80%', bucketScore: '970 - 979', Empleado: 0.0357, Independiente: 0.0690 },
    { bucketCuota: 'Mayor a 80%', bucketScore: '980 - 1000', Empleado: 0.0273, Independiente: 0.0273 }
  ];

  function round2(n) {
    var value = Number(n) || 0;
    return Math.round(value * 100) / 100;
  }

  function normalizeRateDecimal(n) {
    return Number((round2((Number(n) || 0) * 100) / 100).toFixed(4));
  }

  function toNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    if (value === null || typeof value === 'undefined') return NaN;
    var raw = String(value).trim();
    if (!raw) return NaN;
    var normalized = raw
      .replace(/\$/g, '')
      .replace(/\s/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(/,/g, '.');
    return Number(normalized);
  }

  function toBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (value === null || typeof value === 'undefined') return false;
    var raw = String(value).trim().toLowerCase();
    return ['true', '1', 'si', 'sí', 'yes', 'on'].indexOf(raw) >= 0;
  }

  function mapQuotaBucket(pct) {
    if (!Number.isFinite(pct) || pct < 0) return null;
    if (pct <= 0.10) return '0 a 10%';
    if (pct <= 0.20) return '11% a 20%';
    if (pct <= 0.40) return '21% a 30%'; // intencional: así viene la matriz productiva
    if (pct <= 0.50) return '41% a 50%';
    if (pct <= 0.60) return '51% a 60%';
    if (pct <= 0.70) return '61% a 70%';
    if (pct < 0.80) return '71% a 80%';
    return 'Mayor a 80%';
  }

  function mapScoreBucket(score) {
    if (!Number.isFinite(score)) return null;
    for (var i = 0; i < SCORE_BUCKETS.length; i += 1) {
      var bucket = SCORE_BUCKETS[i];
      if (score >= bucket.min && score <= bucket.max) return bucket.label;
    }
    return null;
  }

  function normalizeCustomerType(activity) {
    if (activity === null || typeof activity === 'undefined') return null;
    var normalized = String(activity).trim();
    if (!normalized) return null;
    return normalized === 'Independiente' ? 'Independiente' : 'Empleado';
  }

  function getMaxAmountByTerm(input, term) {
    var map = {
      24: toNumber(input.monto_max_24_tesla),
      36: toNumber(input.monto_max_36_tesla),
      48: toNumber(input.monto_max_48_tesla),
      60: toNumber(input.monto_max_60_tesla),
      72: toNumber(input.monto_max_72_tesla)
    };
    return map[term];
  }

  function lookupPm(bucketCuota, bucketScore, tipoCliente) {
    for (var i = 0; i < PRODUCTIVE_PM_MATRIX.length; i += 1) {
      var row = PRODUCTIVE_PM_MATRIX[i];
      if (row.bucketCuota === bucketCuota && row.bucketScore === bucketScore) {
        var value = tipoCliente === 'Independiente' ? row.Independiente : row.Empleado;
        return Number.isFinite(value) ? value : null;
      }
    }
    return null;
  }

  function buildError(code, message, data) {
    return {
      status: 'ERROR',
      engine_version: VERSION,
      error_code: code,
      mensaje_error: message,
      data: data || null
    };
  }

  function buildOk(data) {
    return {
      status: 'OK',
      engine_version: VERSION,
      error_code: '',
      mensaje_error: '',
      data: data
    };
  }

  function calculateRate(rawInput) {
    var input = {
      nodo_tesla: toNumber(rawInput.nodo_tesla),
      score_tesla: toNumber(rawInput.score_tesla),
      plazo_tesla: toNumber(rawInput.plazo_tesla),
      actividad_economica_tesla: rawInput.actividad_economica_tesla,
      valor_vehiculo_final_tesla: toNumber(rawInput.valor_vehiculo_final_tesla),
      cuota_inicial_seleccionada_tesla: toNumber(rawInput.cuota_inicial_seleccionada_tesla),
      monto_max_24_tesla: toNumber(rawInput.monto_max_24_tesla),
      monto_max_36_tesla: toNumber(rawInput.monto_max_36_tesla),
      monto_max_48_tesla: toNumber(rawInput.monto_max_48_tesla),
      monto_max_60_tesla: toNumber(rawInput.monto_max_60_tesla),
      monto_max_72_tesla: toNumber(rawInput.monto_max_72_tesla),
      cuota_inicial_minima_tesla: toNumber(rawInput.cuota_inicial_minima_tesla),
      seguro_desempleo_tesla: toBoolean(rawInput.seguro_desempleo_tesla),
      seguro_todo_riesgo_tesla: toBoolean(rawInput.seguro_todo_riesgo_tesla)
    };

    if (!Number.isFinite(input.valor_vehiculo_final_tesla) || input.valor_vehiculo_final_tesla <= 0) {
      return buildError('VEHICLE_VALUE_ZERO', 'El valor de vehículo no puede ser $0.');
    }

    if (!Number.isFinite(input.plazo_tesla)) {
      return buildError('TERM_EMPTY', 'El campo plazo se encuentra vacío.');
    }

    if (CONFIG.allowedTerms.indexOf(input.plazo_tesla) === -1) {
      return buildError('TERM_INVALID', 'El plazo seleccionado no es válido.');
    }

    var montoFinanciado = input.valor_vehiculo_final_tesla - input.cuota_inicial_seleccionada_tesla;
    var porcentajeCuotaInicial = input.cuota_inicial_seleccionada_tesla / input.valor_vehiculo_final_tesla;
    var bucketCuota = mapQuotaBucket(porcentajeCuotaInicial);
    var bucketScore = mapScoreBucket(input.score_tesla);
    var tipoCliente = normalizeCustomerType(input.actividad_economica_tesla);
    var montoMaximo = getMaxAmountByTerm(input, input.plazo_tesla);

    if (montoFinanciado < CONFIG.minFinancedAmount) {
      return buildError('FINANCED_AMOUNT_BELOW_MIN', 'Cuota inicial es muy alta', {
        monto_financiado: round2(montoFinanciado),
        porcentaje_cuota_inicial: round2(porcentajeCuotaInicial * 100)
      });
    }

    if (!Number.isFinite(montoMaximo)) {
      return buildError('MAX_AMOUNT_NOT_AVAILABLE', 'No se encontró monto máximo para el plazo informado.', {
        plazo_tesla: input.plazo_tesla
      });
    }

    if (montoFinanciado > montoMaximo) {
      return buildError('FINANCED_AMOUNT_ABOVE_MAX', 'Cuota inicial muy baja', {
        monto_financiado: round2(montoFinanciado),
        monto_maximo: round2(montoMaximo)
      });
    }

    if (!bucketScore) {
      return buildError('SCORE_NOT_PARAMETRIZED', 'El score no se encuentra parametrizado.');
    }

    if (!tipoCliente) {
      return buildError('CUSTOMER_TYPE_MISSING', 'El tipo de cliente no se encuentra informado.');
    }

    var rentabilidadNMV = CONFIG.profitabilityByNode[input.nodo_tesla];
    var ajusteTechoNodo = CONFIG.ceilingAdjustmentByNode[input.nodo_tesla];

    if (!Number.isFinite(rentabilidadNMV) || !Number.isFinite(ajusteTechoNodo)) {
      return buildError('NODE_NOT_PARAMETRIZED', 'El nodo no se encuentra parametrizado.');
    }

    var probabilidadMora = lookupPm(bucketCuota, bucketScore, tipoCliente);
    if (!Number.isFinite(probabilidadMora)) {
      return buildError('PM_NOT_PARAMETRIZED', 'No existe parametrización de probabilidad de mora para la combinación informada.');
    }

    var flagSegmentoFondeoScore800 = input.score_tesla >= CONFIG.fundingScoreThreshold;
    var flagOfertaScore950 = input.score_tesla >= CONFIG.highScoreThreshold;
    var fundingCostTable = flagSegmentoFondeoScore800 ? CONFIG.fundingCostByTerm : CONFIG.fundingCostByTermLowScore;
    var fundingCostTableName = flagSegmentoFondeoScore800 ? 'fundingCostByTerm' : 'fundingCostByTermLowScore';
    var usuryAnnual = flagSegmentoFondeoScore800 ? CONFIG.usuryAnnual : CONFIG.usuryAnnualLowScore;
    var usuryAnnualName = flagSegmentoFondeoScore800 ? 'usuryAnnual' : 'usuryAnnualLowScore';
    var costoFondosNMV = fundingCostTable[input.plazo_tesla];

    if (!Number.isFinite(costoFondosNMV)) {
      return buildError('FUNDING_COST_NOT_PARAMETRIZED', 'No existe costo de fondos parametrizado para el plazo informado.');
    }

    var feeDealerNMV = CONFIG.feeDealerNMV;
    var costoOperativoNMV = CONFIG.operatingCostAnnual / 12;
    var icaNMV = CONFIG.icaAnnual / 12;
    var actividadEconomicaNMV = tipoCliente === 'Independiente' ? (CONFIG.independentActivityAnnual / 12) : 0;
    var riesgoInicialNMV = CONFIG.riskInitialAnnual / 12;
    var tasaUsuraNMV = usuryAnnual / 12;
    var tasaTechoNMV = tasaUsuraNMV - ajusteTechoNodo;
    var tasaPisoNMV = CONFIG.floorMonthlyNMV;

    var espacioNMV = Math.max(
      0,
      tasaTechoNMV - (costoFondosNMV + feeDealerNMV + costoOperativoNMV + icaNMV + actividadEconomicaNMV + rentabilidadNMV)
    );

    var riesgoCreditoNMV = (espacioNMV - riesgoInicialNMV) * probabilidadMora;
    var tasaModeloBrutaNMV = costoFondosNMV + feeDealerNMV + costoOperativoNMV + icaNMV + actividadEconomicaNMV + rentabilidadNMV + riesgoInicialNMV + riesgoCreditoNMV;

    var tasaBaseV2NMV = tasaModeloBrutaNMV;
    if (tasaModeloBrutaNMV > tasaTechoNMV) tasaBaseV2NMV = tasaTechoNMV;
    else if (tasaModeloBrutaNMV < tasaPisoNMV) tasaBaseV2NMV = tasaPisoNMV;

    var descuentoComercialNMV = flagOfertaScore950 ? 0 : (CONFIG.commercialDiscountLifeNMV + CONFIG.commercialDiscountEvNMV);
    var descuentoSeguroDesempleoNMV = input.seguro_desempleo_tesla ? CONFIG.unemploymentInsuranceDiscountNMV : 0;
    var descuentoSeguroTodoRiesgoNMV = input.seguro_todo_riesgo_tesla ? CONFIG.allRiskInsuranceDiscountNMV : 0;
    var descuentoTotalComercialNMV = descuentoComercialNMV + descuentoSeguroDesempleoNMV + descuentoSeguroTodoRiesgoNMV;

    var tasaFinalPreChecksNMV;
    var tasaFinalPostChecksNMV;
    var motivoTasaFinal;

    if (flagOfertaScore950) {
      tasaFinalPreChecksNMV = CONFIG.fixedHighScoreNMV;
      tasaFinalPostChecksNMV = CONFIG.fixedHighScoreNMV - (descuentoSeguroDesempleoNMV + descuentoSeguroTodoRiesgoNMV);
      motivoTasaFinal = (descuentoSeguroDesempleoNMV + descuentoSeguroTodoRiesgoNMV) > 0
        ? 'Oferta score >= 950 + Seguros opcionales'
        : 'Oferta score >= 950';
    } else {
      var tasaPostChecksRawNMV = tasaBaseV2NMV - descuentoTotalComercialNMV;
      tasaFinalPreChecksNMV = tasaBaseV2NMV - descuentoComercialNMV;

      if (tasaPostChecksRawNMV < tasaPisoNMV) {
        tasaFinalPostChecksNMV = tasaPisoNMV;
        motivoTasaFinal = 'Piso comercial';
      } else {
        tasaFinalPostChecksNMV = tasaPostChecksRawNMV;
        motivoTasaFinal = (descuentoSeguroDesempleoNMV + descuentoSeguroTodoRiesgoNMV) > 0
          ? 'Descuento EV + Vida + Seguros'
          : 'Descuento EV + Vida';
      }
    }

    if (!Number.isFinite(tasaFinalPostChecksNMV)) {
      return buildError('RATE_EMPTY', 'El campo tasa se encuentra vacío.');
    }

    var tasaFinalNMVNormalizada = normalizeRateDecimal(tasaFinalPostChecksNMV);
    var tasaFinalEANormalizada = Number((Math.pow(1 + tasaFinalNMVNormalizada, 12) - 1).toFixed(6));

    return buildOk({
      nodo_tesla: input.nodo_tesla,
      score_tesla: input.score_tesla,
      plazo_tesla: input.plazo_tesla,
      actividad_economica_tesla: input.actividad_economica_tesla,
      valor_vehiculo_final_tesla: round2(input.valor_vehiculo_final_tesla),
      cuota_inicial_seleccionada_tesla: round2(input.cuota_inicial_seleccionada_tesla),
      cuota_inicial_minima_tesla: round2(input.cuota_inicial_minima_tesla),
      monto_financiado: round2(montoFinanciado),
      porcentaje_cuota_inicial: round2(porcentajeCuotaInicial),
      bucket_cuota_pm: bucketCuota,
      bucket_score_pm: bucketScore,
      tipo_cliente_pm: tipoCliente,
      probabilidad_mora: round2(probabilidadMora),
      costo_de_fondos_nmv: normalizeRateDecimal(costoFondosNMV),
      fee_dealer_nmv: normalizeRateDecimal(feeDealerNMV),
      costo_operativo_nmv: normalizeRateDecimal(costoOperativoNMV),
      ica_nmv: normalizeRateDecimal(icaNMV),
      actividad_economica_nmv: normalizeRateDecimal(actividadEconomicaNMV),
      rentabilidad_nmv: normalizeRateDecimal(rentabilidadNMV),
      riesgo_inicial_nmv: normalizeRateDecimal(riesgoInicialNMV),
      tasa_usura_nmv: normalizeRateDecimal(tasaUsuraNMV),
      ajuste_tasa_techo_nodo_nmv: normalizeRateDecimal(ajusteTechoNodo),
      tasa_techo_nmv: normalizeRateDecimal(tasaTechoNMV),
      tasa_piso_nmv: normalizeRateDecimal(tasaPisoNMV),
      espacio_nmv: normalizeRateDecimal(espacioNMV),
      riesgo_credito_nmv: normalizeRateDecimal(riesgoCreditoNMV),
      tasa_modelo_bruta_nmv: normalizeRateDecimal(tasaModeloBrutaNMV),
      tasa_base_v2_nmv: normalizeRateDecimal(tasaBaseV2NMV),
      descuento_comercial_nmv: normalizeRateDecimal(descuentoComercialNMV),
      descuento_seguro_desempleo_nmv: normalizeRateDecimal(descuentoSeguroDesempleoNMV),
      descuento_seguro_todo_riesgo_nmv: normalizeRateDecimal(descuentoSeguroTodoRiesgoNMV),
      descuento_total_comercial_nmv: normalizeRateDecimal(descuentoTotalComercialNMV),
      tasa_final_pre_checks_nmv: normalizeRateDecimal(tasaFinalPreChecksNMV),
      tasa_final_post_checks_nmv: tasaFinalNMVNormalizada,
      tasa_final_nmv: tasaFinalNMVNormalizada,
      tasa_final_ea: tasaFinalEANormalizada,
      motivo_tasa_final: motivoTasaFinal,
      flag_segmento_fondeo_score_800: flagSegmentoFondeoScore800,
      tabla_costo_fondos_aplicada: fundingCostTableName,
      tasa_usura_aplicada: usuryAnnual,
      nombre_tasa_usura_aplicada: usuryAnnualName,
      flag_oferta_score_950: flagOfertaScore950
    });
  }

  window.TeslaRatePolicy = {
    version: VERSION,
    calculateRate: calculateRate,
    _private: {
      mapQuotaBucket: mapQuotaBucket,
      mapScoreBucket: mapScoreBucket,
      normalizeCustomerType: normalizeCustomerType
    }
  };
})(window);