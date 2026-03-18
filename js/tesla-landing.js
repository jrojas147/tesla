(function () {
  'use strict';

  var DEBUG_PREFIX = '[TESLA]';
  var RAW = window.TESLA_CONFIG || {};
  var PricingEngine = window.TeslaPricingEngine;
  var DEFAULT_PERSISTENCE_ENDPOINT = 'https://tesla-vercel-api.vercel.app/api/update-negocio-tesla';

  if (!PricingEngine) {
    console.error(DEBUG_PREFIX + ' Falta TeslaPricingEngine.');
    return;
  }

  function q(id) {
    return document.getElementById(id);
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function buildSessionId() {
    return 'tesla_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  }

  function safeStringify(data) {
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return String(data);
    }
  }

  function fmtMoney(n) {
    return '$' + new Intl.NumberFormat('es-CO').format(Math.round(Number(n) || 0));
  }

  function scrollTopNow() {
    window.scrollTo(0, 0);
  }

  function normalizeRate(value) {
    if (value === null || typeof value === 'undefined') return null;

    var cleaned = String(value)
      .replace('%', '')
      .replace(',', '.')
      .trim();

    var parsed = Number(cleaned);
    return isNaN(parsed) ? null : parsed / 100;
  }

  var CONFIG = PricingEngine.buildConfig(RAW);
  var FLOW_STATUS = RAW.flowStatus || {};

  var STATE = {
    session: {
      id: buildSessionId(),
      startedAt: new Date().toISOString(),
      userAgent: window.navigator.userAgent,
      path: window.location.pathname,
      query: window.location.search
    },
    config: {
      clienteId: CONFIG.clienteId,
      negocioId: CONFIG.negocioId,
      respuestaFinalTesla: CONFIG.respuestaFinalTesla,
      valorVehiculo: CONFIG.valorVehiculo,
      valorFinanciar: CONFIG.valorFinanciar,
      cuotaInicialMinimaPerfil: CONFIG.cuotaInicialMinimaPerfil,
      cuotaMaximaPerfil: CONFIG.cuotaMaximaPerfil,
      plazo: CONFIG.plazo,
      valorSeguroTodoRiesgo: CONFIG.valorSeguroTodoRiesgo,
      tasasRaw: clone(CONFIG.tasasRaw),
      montoMaximosPorPlazo: clone(CONFIG.montoMaximosPorPlazo),
      nodo: CONFIG.nodo,
      score: CONFIG.score,
      actividadEconomica: CONFIG.actividadEconomica,
      debug: !!RAW.debug
    },
    flow: {
      respuestaFinalRaw: CONFIG.respuestaFinalTesla,
      normalized: null,
      acceptFormId: null,
      acceptFormReady: false,
      blocked: !!FLOW_STATUS.flujoBloqueadoTesla,
      blockedReason: FLOW_STATUS.motivoBloqueoFlujoTesla || '',
      blockedStatus: FLOW_STATUS.estadoFlujoClienteTesla || ''
    },
    simulator: {
      plazosDisponibles: [],
      selectedPlazo: null,
      selectedCuotaInicial: null,
      includeSeguroAuto: true,
      includeSeguroDesempleo: true,
      calculation: null,
      snapshotOferta: null,
      lastUpdatedAt: null
    },
    decision: {
      type: null,
      status: 'idle',
      submittedAt: null,
      payload: null,
      persistenceResult: null
    },
    ui: {
      currentPage: CONFIG.mostrarOferta ? 2 : 1,
      modalOpen: false,
      acceptBusy: false,
      reevaluarBusy: false,
      rejectBusy: false
    },
    errors: [],
    lastPersistenceError: null,
    debugBoxEnabled: true
  };

  window.TESLA_STATE = STATE;

  var DOM = {};

  function captureDom() {
    DOM.page1 = q('page-1');
    DOM.page2 = q('page-2');
    DOM.page3 = q('page-3');
    DOM.page4 = q('page-4');
    DOM.page5 = q('page-5');
    DOM.page6 = q('page-6');
    DOM.page7 = q('page-7');

    DOM.loginError = q('login-error');
    DOM.generalConfigError = q('general-config-error');
    DOM.acceptFormConfigError = q('accept-form-config-error');
    DOM.acceptFormErrorDetail = q('accept-form-error-detail');
    DOM.reevaluarFormConfigError = q('reevaluar-form-config-error');

    DOM.inputDoc = q('input-doc');
    DOM.inputRn = q('input-rn');
    DOM.btnContinue = q('btn-continue');

    DOM.rangeInicial = q('range-inicial');
    DOM.inputPlazo = q('input-plazo');
    DOM.checkAuto = q('check-auto');
    DOM.checkDesempleo = q('check-desempleo');

    DOM.labelMin = q('label-min');
    DOM.labelMax = q('label-max');
    DOM.valRangeLabel = q('val-range-label');
    DOM.displayCuotaMinimaRequerida = q('display-cuota-minima-requerida');
    DOM.displayTasa = q('display-tasa');
    DOM.lblCapital = q('lbl-capital');
    DOM.resBase = q('res-base');
    DOM.resVida = q('res-vida');
    DOM.resAuto = q('res-auto');
    DOM.resDesempleo = q('res-desempleo');
    DOM.resTotal = q('res-total');
    DOM.step2ValorCarro = q('step2-valor-carro');
    DOM.step2RespuestaFinal = q('step2-respuesta-final');
    DOM.plazoConfigWarning = q('plazo-config-warning');

    DOM.btnFirmar = q('btn-firmar');
    DOM.btnDesistir = q('btn-desistir');
    DOM.btnRechazar = q('btn-rechazar');
    DOM.btnVolverInicio = q('btn-volver-inicio');

    DOM.page3Title = q('page-3-title');
    DOM.page3Description = q('page-3-description');
    DOM.page3FlowBadge = q('page-3-flow-badge');
    DOM.acceptFormContainer = q('accept-form-container');
    DOM.acceptFormFrame = q('accept-form-frame');

    DOM.reevaluarFormContainer = q('reevaluar-form-container');
    DOM.reevaluarFormFrame = q('reevaluar-form-frame');

    DOM.blockedFlowTitle = q('blocked-flow-title');
    DOM.blockedFlowDescription = q('blocked-flow-description');
    DOM.blockedFlowStatus = q('blocked-flow-status');
    DOM.blockedFlowReason = q('blocked-flow-reason');

    DOM.modal = q('tesla-confirm-modal');
    DOM.modalRespuestaFinal = q('modal-respuesta-final');
    DOM.modalPlazo = q('modal-plazo');
    DOM.modalCuotaInicial = q('modal-cuota-inicial');
    DOM.modalTasa = q('modal-tasa');
    DOM.modalCapital = q('modal-capital');
    DOM.modalCuotaTotal = q('modal-cuota-total');
    DOM.modalErrorBox = q('modal-error-box');
    DOM.btnModalCancel = q('btn-modal-cancel');
    DOM.btnModalConfirm = q('btn-modal-confirm');

    DOM.mainFormContent = q('main-form-content');
    DOM.step1 = q('step-1');
    DOM.step2 = q('step-2');
    DOM.step3 = q('step-3');
    DOM.stepLine1 = q('step-line-1');
    DOM.stepLine2 = q('step-line-2');

    DOM.debugBox = q('tesla-debug-log');
    
    DOM.desistirFormConfigError = q('desistir-form-config-error');
    DOM.desistirFormContainer = q('desistir-form-container');
    DOM.desistirFormFrame = q('desistir-form-frame');
  }

  var Logger = {
    emit: function (category, level, title, data) {
      var entry = {
        timestamp: new Date().toISOString(),
        category: category,
        level: level,
        title: title,
        data: typeof data === 'undefined' ? null : data
      };

      try {
        if (level === 'error') {
          console.error(DEBUG_PREFIX + ' ' + category + ' ' + title, data || '');
        } else if (level === 'warn') {
          console.warn(DEBUG_PREFIX + ' ' + category + ' ' + title, data || '');
        } else {
          console.log(DEBUG_PREFIX + ' ' + category + ' ' + title, data || '');
        }
      } catch (e) {}

      writeDebugBox(entry);

      if (level === 'error') {
        STATE.errors.push(entry);
      }

      return entry;
    },
    technical: function (title, data) {
      return Logger.emit('technical_logs', 'info', title, data);
    },
    functional: function (title, data) {
      return Logger.emit('functional_logs', 'info', title, data);
    },
    configError: function (title, data) {
      return Logger.emit('config_errors', 'error', title, data);
    },
    calcError: function (title, data) {
      return Logger.emit('calculation_errors', 'error', title, data);
    },
    persistenceError: function (title, data) {
      STATE.lastPersistenceError = {
        title: title,
        data: data,
        at: new Date().toISOString()
      };
      return Logger.emit('persistence_errors', 'error', title, data);
    },
    warn: function (title, data) {
      return Logger.emit('technical_logs', 'warn', title, data);
    }
  };

  function clearDebugBox() {
    if (!DOM.debugBox) return;
    DOM.debugBox.textContent = '=== TESLA DEBUG LOG ===\n';
  }

  function writeDebugBox(entry) {
    if (!DOM.debugBox || !STATE.debugBoxEnabled) return;
    DOM.debugBox.textContent += '\n[' + entry.timestamp + '] [' + entry.category + '] [' + entry.level.toUpperCase() + '] ' + entry.title + '\n';
    if (entry.data !== null) {
      DOM.debugBox.textContent += safeStringify(entry.data) + '\n';
    }
  }

  function setBusy(button, isBusy, loadingText) {
    if (!button) return;

    if (typeof button.dataset.originalText === 'undefined' || button.dataset.originalText === '') {
      button.dataset.originalText = button.textContent;
    }

    button.disabled = !!isBusy;
    button.classList.toggle('is-loading', !!isBusy);
    button.classList.toggle('is-busy', !!isBusy);

    if (isBusy && loadingText) {
      button.textContent = loadingText;
    } else {
      button.textContent = button.dataset.originalText;
    }
  }

  function show(el) {
    if (el) el.classList.remove('hide');
  }

  function hide(el) {
    if (el) el.classList.add('hide');
  }

  function setText(el, value) {
    if (el) el.textContent = value;
  }

  function getSafeRecordId() {
    var hiddenRecordId = q('tesla-negocio-id');
    var recordId =
      (CONFIG && CONFIG.negocioId) ||
      (RAW && RAW.negocioId) ||
      (hiddenRecordId && hiddenRecordId.value) ||
      '';

    Logger.technical('getSafeRecordId', {
      configNegocioId: CONFIG && CONFIG.negocioId ? CONFIG.negocioId : '',
      rawNegocioId: RAW && RAW.negocioId ? RAW.negocioId : '',
      hiddenNegocioId: hiddenRecordId ? hiddenRecordId.value : '',
      finalRecordId: recordId
    });

    return String(recordId || '').trim();
  }

  function mostrarPagina(pagina) {
    var pages = [DOM.page1, DOM.page2, DOM.page3, DOM.page4, DOM.page5, DOM.page6, DOM.page7];

    for (var i = 0; i < pages.length; i++) {
      hide(pages[i]);
    }

    if (pagina === 1) show(DOM.page1);
    if (pagina === 2) show(DOM.page2);
    if (pagina === 3) show(DOM.page3);
    if (pagina === 4) show(DOM.page4);
    if (pagina === 5) show(DOM.page5);
    if (pagina === 6) show(DOM.page6);
    if (pagina === 7) {
      show(DOM.page7);
      if (DOM.page1) hide(DOM.page1);
      if (DOM.mainFormContent) DOM.mainFormContent.classList.add('showing-page-7');
    } else {
      if (DOM.mainFormContent) DOM.mainFormContent.classList.remove('showing-page-7');
    }

    STATE.ui.currentPage = pagina;
    actualizarStepper(pagina);
    Logger.technical('mostrarPagina', { pagina: pagina });
  }

  function resetStepper() {
    [DOM.step1, DOM.step2, DOM.step3].forEach(function (el) {
      if (!el) return;
      el.classList.remove('active');
      el.classList.remove('completed');
    });

    [DOM.stepLine1, DOM.stepLine2].forEach(function (el) {
      if (!el) return;
      el.classList.remove('active');
    });
  }

  function actualizarStepper(pagina) {
    resetStepper();
    if (pagina === 7) return;

    if (pagina === 1) {
      DOM.step1 && DOM.step1.classList.add('active');
      return;
    }

    if (pagina === 2) {
      DOM.step1 && DOM.step1.classList.add('completed');
      DOM.step2 && DOM.step2.classList.add('active');
      DOM.stepLine1 && DOM.stepLine1.classList.add('active');
      return;
    }

    DOM.step1 && DOM.step1.classList.add('completed');
    DOM.step2 && DOM.step2.classList.add('completed');
    DOM.step3 && DOM.step3.classList.add('active');
    DOM.stepLine1 && DOM.stepLine1.classList.add('active');
    DOM.stepLine2 && DOM.stepLine2.classList.add('active');
  }

  function mostrarErrorGeneral(message, details) {
    var msgStr = message ? String(message) : '';
    var esErrorReconocida = msgStr.indexOf('reconocida') !== -1;
    if (RAW.mostrarOferta === true && esErrorReconocida) {
      Logger.warn('Oferta válida (mostrarOferta=true); no se cambia a login.', { message: message });
      if (DOM.loginError) hide(DOM.loginError);
      return;
    }

    mostrarPagina(7);
    Logger.configError('mostrarErrorGeneral', {
      message: message,
      details: details || null
    });
  }

  function initLoginButton() {
    if (!DOM.btnContinue || !DOM.inputDoc || !DOM.inputRn) {
      Logger.warn('initLoginButton: faltan elementos', {
        existeBtn: !!DOM.btnContinue,
        existeDoc: !!DOM.inputDoc,
        existeRn: !!DOM.inputRn
      });
      return;
    }

    function validate() {
      var doc = DOM.inputDoc.value.trim();
      var rn = DOM.inputRn.value.trim();
      DOM.btnContinue.disabled = !(doc.length > 5 && rn.length > 1);
    }

    DOM.inputDoc.addEventListener('input', validate);
    DOM.inputRn.addEventListener('input', validate);
    validate();
  }

  function resolverFlujoPorRespuestaFinal() {
    var configValue = CONFIG.respuestaFinalTesla;
    var rawValue = configValue != null && configValue !== '' ? configValue : (RAW.respuestaFinalTesla != null && RAW.respuestaFinalTesla !== '' ? RAW.respuestaFinalTesla : '');
    var raw = String(rawValue).trim();
    var normalized = raw.toLowerCase().replace(/\s+/g, ' ').trim();
    var rawUpper = raw.toUpperCase();

    Logger.technical('REFERIDO_DEBUG entrada', {
      CONFIG_respuestaFinalTesla: configValue,
      RAW_respuestaFinalTesla: RAW.respuestaFinalTesla,
      rawUsado: raw,
      rawLength: raw.length,
      normalized: normalized,
      rawUpper: rawUpper,
      checkReferidoExact: normalized === 'referido',
      checkReferidIndexOf: normalized.indexOf('referid'),
      checkRawUpperIndexOf: rawUpper.indexOf('REFERIDO'),
      versionResolver: 'v2-referido'
    });

    var result = {
      raw: raw,
      normalized: 'desconocido',
      acceptFormId: '',
      acceptTitle: 'CONTINÚA CON TU SOLICITUD',
      acceptDescription: 'Continúa registrando la información necesaria para obtener tu crédito de vehículo.',
      flowBadge: '',
      canAccept: false
    };

    if (!raw) {
      result.reason = 'RESPUESTA_FINAL_VACIA';
      Logger.technical('REFERIDO_DEBUG salida', { reason: result.reason, rawVacio: true });
      return result;
    }

    if (normalized === 'referido' || normalized.indexOf('referid') !== -1 || rawUpper.indexOf('REFERIDO') !== -1) {
      result.normalized = 'referido';
      result.acceptFormId = (RAW.forms && RAW.forms.aceptar && RAW.forms.aceptar.referido) || '';
      result.acceptTitle = 'FLUJO REFERIDO';
      result.acceptDescription = 'Tu solicitud ha sido referida. Continúa con la información necesaria para tu crédito de vehículo.';
      result.flowBadge = 'Flujo referido';
      result.canAccept = !!result.acceptFormId;
      result.reason = result.canAccept ? null : 'FORM_REFERIDO_NO_CONFIGURADO';
      Logger.technical('REFERIDO_DEBUG salida', { matched: 'referido', normalized: result.normalized });
      return result;
    }

    if (normalized.indexOf('preaprob') !== -1) {
      result.normalized = 'preaprobado';
      result.acceptFormId = (RAW.forms && RAW.forms.aceptar && RAW.forms.aceptar.preaprobado) || '';
      result.acceptTitle = 'CONTINÚA CON TU PREAPROBACIÓN';
      result.acceptDescription = 'Continúa registrando la información requerida para gestionar tu flujo preaprobado.';
      result.flowBadge = 'Flujo preaprobado';
      result.canAccept = !!result.acceptFormId;
      result.reason = result.canAccept ? null : 'FORM_PREAPROBADO_NO_CONFIGURADO';
      return result;
    }

    if (normalized.indexOf('aprob') !== -1) {
      result.normalized = 'aprobado';
      result.acceptFormId = (RAW.forms && RAW.forms.aceptar && RAW.forms.aceptar.aprobado) || '';
      result.acceptTitle = 'ESTÁS A PUNTO DE OBTENER TU CRÉDITO DE VEHÍCULO';
      result.acceptDescription = 'Continúa registrando la información necesaria para obtener tu crédito de vehículo.';
      result.flowBadge = 'Flujo aprobado';
      result.canAccept = !!result.acceptFormId;
      result.reason = result.canAccept ? null : 'FORM_APROBADO_NO_CONFIGURADO';
      return result;
    }

    if (rawUpper.indexOf('REFERIDO') !== -1) {
      result.normalized = 'referido';
      result.flowBadge = 'Flujo referido';
      result.acceptTitle = 'FLUJO REFERIDO';
      result.acceptDescription = 'Tu solicitud ha sido referida. Continúa con la información necesaria para tu crédito de vehículo.';
      result.reason = null;
      Logger.technical('REFERIDO_DEBUG salida', { matched: 'referido_fallback', normalized: result.normalized });
      return result;
    }

    Logger.technical('REFERIDO_DEBUG salida', { matched: 'ninguno', reason: 'RESPUESTA_FINAL_NO_RECONOCIDA', raw: raw, normalized: normalized });
    result.reason = 'RESPUESTA_FINAL_NO_RECONOCIDA';
    return result;
  }

  function waitForHubspotForms() {
    return new Promise(function (resolve, reject) {
      var attempts = 0;
      var maxAttempts = 80;

      function isReady() {
        return !!(window.hbspt && window.hbspt.forms && typeof window.hbspt.forms.create === 'function');
      }

      if (isReady()) {
        resolve();
        return;
      }

      var timer = setInterval(function () {
        attempts += 1;

        if (isReady()) {
          clearInterval(timer);
          resolve();
          return;
        }

        if (attempts >= maxAttempts) {
          clearInterval(timer);
          reject(new Error('HubSpot Forms no quedó disponible en window.hbspt.'));
        }
      }, 250);
    });
  }

  function loadHubspotFormsScriptIfNeeded() {
    if (window.hbspt && window.hbspt.forms && typeof window.hbspt.forms.create === 'function') {
      return Promise.resolve();
    }
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.charset = 'utf-8';
      script.type = 'text/javascript';
      script.src = 'https://js.hsforms.net/forms/v2.js';
      script.onload = function () {
        var attempts = 0;
        var t = setInterval(function () {
          attempts++;
          if (window.hbspt && window.hbspt.forms && typeof window.hbspt.forms.create === 'function') {
            clearInterval(t);
            resolve();
          } else if (attempts >= 40) {
            clearInterval(t);
            reject(new Error('HubSpot Forms no disponible tras cargar el script.'));
          }
        }, 250);
      };
      script.onerror = function () {
        reject(new Error('No se pudo cargar el script de formularios de HubSpot.'));
      };
      document.head.appendChild(script);
    });
  }

  function frameHasFormContent(targetEl) {
    if (!targetEl) return false;
    return targetEl.querySelector('.hs-form') || targetEl.querySelector('iframe') || targetEl.children.length > 0;
  }

  function renderHubspotForm(targetEl, formId) {
    return new Promise(function (resolve, reject) {
      if (!targetEl) {
        reject(new Error('No existe contenedor destino para el formulario.'));
        return;
      }

      var formIdStr = formId ? String(formId).trim() : '';
      if (!formIdStr) {
        reject(new Error('No existe formId para renderizar el formulario.'));
        return;
      }

      targetEl.setAttribute('data-form-id', formIdStr);
      targetEl.setAttribute('data-region', 'na1');
      targetEl.setAttribute('data-portal-id', '44539823');

      waitForHubspotForms()
        .catch(function () {
          return loadHubspotFormsScriptIfNeeded();
        })
        .then(function () {
          if (frameHasFormContent(targetEl)) {
            resolve();
            return;
          }
          targetEl.innerHTML = '';
          var mountId = targetEl.id;
          if (!mountId) {
            mountId = 'hs-form-mount-' + Math.random().toString(36).slice(2, 8);
            targetEl.id = mountId;
          }
          window.hbspt.forms.create({
            region: 'na1',
            portalId: '44539823',
            formId: formIdStr,
            target: '#' + mountId
          });
          resolve();
        })
        .catch(reject);
    });
  }

  function configurarFormularioAceptacion(flowResult) {
    STATE.flow.respuestaFinalRaw = flowResult.raw;
    STATE.flow.normalized = flowResult.normalized;
    STATE.flow.acceptFormId = flowResult.acceptFormId || null;
    STATE.flow.acceptFormReady = !!flowResult.canAccept;

    // Ajuste mínimo: si el flujo viene como REFERIDO pero no tiene formulario propio configurado,
    // reusar el formulario de PREAPROBADO únicamente para poder mostrar el formulario,
    // sin alterar la resolución general del flujo ni otros casos.
    if (
      STATE.flow.normalized === 'referido' &&
      !STATE.flow.acceptFormId &&
      window.TESLA_CONFIG &&
      window.TESLA_CONFIG.forms &&
      window.TESLA_CONFIG.forms.aceptar &&
      window.TESLA_CONFIG.forms.aceptar.preaprobado
    ) {
      STATE.flow.acceptFormId = window.TESLA_CONFIG.forms.aceptar.preaprobado;
      STATE.flow.acceptFormReady = true;
      Logger.warn('FORM_REFERIDO_SIN_ID, usando formulario de PREAPROBADO como fallback solo en front', {
        fallbackFormId: STATE.flow.acceptFormId,
        normalized: STATE.flow.normalized
      });
    }

    var canAcceptNow = !!(STATE.flow.acceptFormReady && STATE.flow.acceptFormId);

    setText(DOM.page3Title, flowResult.acceptTitle || 'CONTINÚA CON TU SOLICITUD');
    setText(DOM.page3Description, flowResult.acceptDescription || '');

    if (DOM.page3FlowBadge) {
      if (flowResult.flowBadge) {
        DOM.page3FlowBadge.textContent = flowResult.flowBadge;
        show(DOM.page3FlowBadge);
      } else {
        hide(DOM.page3FlowBadge);
      }
    }

    if (!canAcceptNow) {
      hide(DOM.acceptFormContainer);
      show(DOM.acceptFormConfigError);
      if (DOM.acceptFormErrorDetail) {
        DOM.acceptFormErrorDetail.textContent = 'No hay formId configurado para este flujo (aprobado/preaprobado). Revisa forms.aceptar en la plantilla.';
        DOM.acceptFormErrorDetail.classList.remove('hide');
      }
      Logger.configError('Flujo sin formulario de aceptación configurado', flowResult);
      return;
    }

    hide(DOM.acceptFormConfigError);
    if (DOM.acceptFormErrorDetail) {
      DOM.acceptFormErrorDetail.textContent = '';
      DOM.acceptFormErrorDetail.classList.add('hide');
    }
    show(DOM.acceptFormContainer);

    if (DOM.acceptFormFrame) {
      DOM.acceptFormFrame.setAttribute('data-form-id', String(STATE.flow.acceptFormId || flowResult.acceptFormId || ''));
      DOM.acceptFormFrame.setAttribute('data-region', 'na1');
      DOM.acceptFormFrame.setAttribute('data-portal-id', '44539823');
    }

    Logger.functional('Formulario dinámico de aceptación configurado', {
      normalized: flowResult.normalized,
      formId: STATE.flow.acceptFormId || flowResult.acceptFormId
    });
  }

  function ensureAcceptFormRendered() {
    if (!STATE.flow.acceptFormReady || !STATE.flow.acceptFormId) {
      show(DOM.acceptFormConfigError);
      hide(DOM.acceptFormContainer);
      if (DOM.acceptFormErrorDetail) {
        DOM.acceptFormErrorDetail.textContent = 'FormId: ' + (STATE.flow.acceptFormId || '(vacío)') + '. Portal: 44539823. Comprueba que el formulario existe en HubSpot.';
        DOM.acceptFormErrorDetail.classList.remove('hide');
      }
      Logger.configError('No se puede renderizar formulario de aceptación', {
        acceptFormReady: STATE.flow.acceptFormReady,
        acceptFormId: STATE.flow.acceptFormId
      });
      return Promise.reject(new Error('Formulario de aceptación no configurado.'));
    }

    show(DOM.acceptFormContainer);
    hide(DOM.acceptFormConfigError);
    if (DOM.acceptFormErrorDetail) {
      DOM.acceptFormErrorDetail.textContent = '';
      DOM.acceptFormErrorDetail.classList.add('hide');
    }

    var formIdStr = String(STATE.flow.acceptFormId);
    return renderHubspotForm(DOM.acceptFormFrame, formIdStr)
      .then(function () {
        Logger.functional('Formulario de aceptación renderizado', {
          formId: STATE.flow.acceptFormId,
          normalized: STATE.flow.normalized
        });
      })
      .catch(function (err) {
        hide(DOM.acceptFormContainer);
        show(DOM.acceptFormConfigError);
        if (DOM.acceptFormErrorDetail) {
          DOM.acceptFormErrorDetail.textContent = 'FormId: ' + (STATE.flow.acceptFormId || '') + '. Portal: 44539823. ' + (err && err.message ? err.message : '');
          DOM.acceptFormErrorDetail.classList.remove('hide');
        }
        Logger.configError('Error renderizando formulario de aceptación', {
          formId: STATE.flow.acceptFormId,
          error: err && err.message ? err.message : String(err)
        });
        throw err;
      });
  }

  function ensureReevaluarFormRendered() {
    var reevaluarFormId = RAW.forms && RAW.forms.reevaluar ? RAW.forms.reevaluar : '';

    if (!reevaluarFormId) {
      if (DOM.reevaluarFormConfigError) show(DOM.reevaluarFormConfigError);
      if (DOM.reevaluarFormContainer) hide(DOM.reevaluarFormContainer);
      Logger.configError('No existe formulario de reevaluación configurado', null);
      return Promise.reject(new Error('Formulario de reevaluación no configurado.'));
    }

    if (!DOM.reevaluarFormFrame) {
      Logger.configError('No existe contenedor para formulario de reevaluación', null);
      return Promise.reject(new Error('Contenedor de reevaluación no disponible.'));
    }

    if (DOM.reevaluarFormContainer) show(DOM.reevaluarFormContainer);
    if (DOM.reevaluarFormConfigError) hide(DOM.reevaluarFormConfigError);

    DOM.reevaluarFormFrame.setAttribute('data-form-id', reevaluarFormId);
    DOM.reevaluarFormFrame.setAttribute('data-region', 'na1');
    DOM.reevaluarFormFrame.setAttribute('data-portal-id', '44539823');

    return renderHubspotForm(DOM.reevaluarFormFrame, reevaluarFormId)
      .then(function () {
        Logger.functional('Formulario de reevaluación renderizado', {
          formId: reevaluarFormId
        });
      })
      .catch(function (err) {
        if (DOM.reevaluarFormContainer) hide(DOM.reevaluarFormContainer);
        if (DOM.reevaluarFormConfigError) show(DOM.reevaluarFormConfigError);

        Logger.configError('Error renderizando formulario de reevaluación', {
          formId: reevaluarFormId,
          error: err && err.message ? err.message : String(err)
        });
        throw err;
      });
  }

  function actualizarVisibilidadBotonReevaluar() {
    var cuotaMinimaFinal = 0;

    if (
      STATE.simulator &&
      STATE.simulator.calculation &&
      STATE.simulator.calculation.restricciones
    ) {
      cuotaMinimaFinal = Number(STATE.simulator.calculation.restricciones.cuotaMinimaFinal) || 0;
    }

    var debeMostrar = cuotaMinimaFinal > 0;

    if (!DOM.btnDesistir) {
      Logger.warn('No existe btn-desistir para controlar visibilidad dinámica', {
        cuotaMinimaFinal: cuotaMinimaFinal
      });
      return;
    }

    if (debeMostrar) {
      show(DOM.btnDesistir);
    } else {
      hide(DOM.btnDesistir);
    }

    Logger.functional('Visibilidad botón re-evaluar actualizada', {
      cuotaMinimaFinal: cuotaMinimaFinal,
      visible: debeMostrar
    });
  }

  function renderBlockedFlowPage() {
    setText(DOM.blockedFlowTitle, 'TU SOLICITUD SIGUE EN PROCESO');
    setText(
      DOM.blockedFlowDescription,
      'Ya registramos una gestión previa sobre esta solicitud. No necesitas volver a diligenciar el flujo en este momento.'
    );
    setText(DOM.blockedFlowStatus, STATE.flow.blockedStatus || 'En proceso');
    setText(
      DOM.blockedFlowReason,
      STATE.flow.blockedReason || 'Flujo ya gestionado previamente'
    );

    Logger.functional('Pantalla de flujo bloqueado renderizada', {
      blocked: STATE.flow.blocked,
      blockedStatus: STATE.flow.blockedStatus,
      blockedReason: STATE.flow.blockedReason
    });
  }

  function renderValorVehiculo() {
    if (!DOM.step2ValorCarro) return;

    var raw = DOM.step2ValorCarro.getAttribute('data-valor-vehiculo');
    var valor = Number(raw);

    if (!isNaN(valor) && valor > 0) {
      DOM.step2ValorCarro.textContent = fmtMoney(valor);
    }
  }

  function renderPlazosDisponibles() {
    if (!DOM.inputPlazo) return;

    var plazosDisponibles = PricingEngine.getPlazosDisponibles(CONFIG);
    STATE.simulator.plazosDisponibles = clone(plazosDisponibles);

    DOM.inputPlazo.innerHTML = '';

    if (!plazosDisponibles.length) {
      show(DOM.plazoConfigWarning);
      Logger.configError('No existen plazos disponibles parametrizados', {
        montoMaximosPorPlazo: CONFIG.montoMaximosPorPlazo
      });
      return;
    }

    hide(DOM.plazoConfigWarning);

    for (var i = 0; i < plazosDisponibles.length; i++) {
      var plazo = plazosDisponibles[i];
      var option = document.createElement('option');
      option.value = String(plazo);
      option.textContent = plazo + ' meses';
      DOM.inputPlazo.appendChild(option);
    }

    if (plazosDisponibles.indexOf(CONFIG.plazo) !== -1) {
      DOM.inputPlazo.value = String(CONFIG.plazo);
    } else {
      DOM.inputPlazo.value = String(plazosDisponibles[0]);
      Logger.warn('Plazo default no disponible, se usa primer plazo parametrizado', {
        plazoDefault: CONFIG.plazo,
        plazosDisponibles: plazosDisponibles
      });
    }

    if (String(CONFIG.plazo) === '84' && plazosDisponibles.indexOf(84) === -1) {
      show(DOM.plazoConfigWarning);
      Logger.configError('84 meses solicitado pero no parametrizado; se bloquea/remueve del flujo', {
        plazoDefault: CONFIG.plazo,
        plazosDisponibles: plazosDisponibles
      });
    }
  }

  function actualizarRestriccionesPorPlazo() {
    if (!DOM.inputPlazo || !DOM.rangeInicial) return;

    var plazo = Number(DOM.inputPlazo.value);
    var result = PricingEngine.getRestriccionesFinales(CONFIG, plazo);

    if (!result.ok) {
      Logger.calcError('Error al calcular restricciones por plazo', result.error);
      show(DOM.generalConfigError);
      return;
    }

    var reglas = result.data;
    DOM.rangeInicial.min = String(reglas.cuotaMinimaFinal);
    DOM.rangeInicial.max = String(reglas.cuotaMaximaFinal);

    var currentValue = Number(DOM.rangeInicial.value) || reglas.cuotaMinimaFinal;
    if (currentValue < reglas.cuotaMinimaFinal) currentValue = reglas.cuotaMinimaFinal;
    if (currentValue > reglas.cuotaMaximaFinal) currentValue = reglas.cuotaMaximaFinal;
    DOM.rangeInicial.value = String(currentValue);

    setText(DOM.labelMin, fmtMoney(reglas.cuotaMinimaFinal));
    setText(DOM.labelMax, fmtMoney(reglas.cuotaMaximaFinal));
    setText(DOM.displayCuotaMinimaRequerida, fmtMoney(reglas.cuotaMinimaFinal));
    setText(DOM.valRangeLabel, fmtMoney(currentValue));
  }

  function buildSnapshotOferta(calculation) {
    return {
      cliente_id_tesla: CONFIG.clienteId,
      negocio_id_tesla: CONFIG.negocioId,
      respuesta_final_tesla: CONFIG.respuestaFinalTesla,

      plazo_seleccionado_tesla: calculation.plazo,
      cuota_inicial_seleccionada_tesla: calculation.cuotaInicial,
      porcentaje_cuota_inicial_tesla: calculation.porcentajeCuotaInicial,
      capital_financiado_tesla: calculation.capitalFinanciado,

      rate_source_tesla: calculation.rateSource || null,
      motivo_tasa_final_tesla: calculation.motivoTasaFinal || null,
      bucket_cuota_pm_tesla: calculation.bucketCuotaPm || null,
      bucket_score_pm_tesla: calculation.bucketScorePm || null,
      probabilidad_mora_tesla: calculation.probabilidadMora,
      tasa_ea_tesla: calculation.tasaFinalEA,

      tasa_bucket_tesla: calculation.tasaBucket,
      tasa_raw_tesla: calculation.tasaRaw,
      tasa_normalizada_tesla: calculation.tasaNormalizada,
      tasa_mostrada_tesla: calculation.tasaMostrada,

      seguro_auto_seleccionado_tesla: calculation.seguros.autoSeleccionado,
      seguro_desempleo_seleccionado_tesla: calculation.seguros.desempleoSeleccionado,
      valor_seguro_vida_tesla: calculation.seguros.valorSeguroVida,
      valor_seguro_auto_tesla: calculation.seguros.valorSeguroAuto,
      valor_seguro_desempleo_tesla: calculation.seguros.valorSeguroDesempleo,

      cuota_base_tesla: calculation.cuotaBase,
      cuota_total_tesla: calculation.cuotaTotal,

      pricing_engine_version_tesla: calculation.engineVersion,
      rate_policy_result_tesla: calculation.ratePolicyResult ? clone(calculation.ratePolicyResult) : null,

      metadata_sesion_tesla: {
        session_id: STATE.session.id,
        user_agent: STATE.session.userAgent,
        path: STATE.session.path,
        query: STATE.session.query
      }
    };
  }

  function syncTeslaState(calculation) {
    STATE.simulator.selectedPlazo = calculation.plazo;
    STATE.simulator.selectedCuotaInicial = calculation.cuotaInicial;
    STATE.simulator.includeSeguroAuto = calculation.seguros.autoSeleccionado;
    STATE.simulator.includeSeguroDesempleo = calculation.seguros.desempleoSeleccionado;
    STATE.simulator.calculation = clone(calculation);
    STATE.simulator.snapshotOferta = buildSnapshotOferta(calculation);
    STATE.simulator.lastUpdatedAt = new Date().toISOString();

    window.TESLA_STATE = STATE;
  }

  function calcularYRenderizarOferta(sourceEvent) {
    if (!DOM.rangeInicial || !DOM.inputPlazo) return;

    var calculationResult = PricingEngine.calcularOferta(CONFIG, {
      plazo: Number(DOM.inputPlazo.value),
      cuotaInicial: Number(DOM.rangeInicial.value),
      incluirSeguroAuto: !!(DOM.checkAuto && DOM.checkAuto.checked),
      incluirSeguroDesempleo: !!(DOM.checkDesempleo && DOM.checkDesempleo.checked)
    });

    if (!calculationResult.ok) {
      Logger.calcError('Error al calcular oferta', {
        sourceEvent: sourceEvent || null,
        error: calculationResult.error
      });
      show(DOM.generalConfigError);
      return;
    }

    hide(DOM.generalConfigError);

    var data = calculationResult.data;
    setText(DOM.valRangeLabel, fmtMoney(data.cuotaInicial));
    setText(DOM.displayTasa, data.tasaMostrada);
    setText(DOM.lblCapital, fmtMoney(data.capitalFinanciado));
    setText(DOM.resBase, fmtMoney(data.cuotaBase));
    setText(DOM.resVida, fmtMoney(data.seguros.valorSeguroVida));
    setText(DOM.resAuto, fmtMoney(data.seguros.valorSeguroAuto));
    setText(DOM.resDesempleo, fmtMoney(data.seguros.valorSeguroDesempleo));
    setText(DOM.resTotal, fmtMoney(data.cuotaTotal));

    syncTeslaState(data);
    actualizarVisibilidadBotonReevaluar();

    Logger.functional('Oferta recalculada', {
      sourceEvent: sourceEvent || null,
      calculation: data,
      rateSummary: {
        rateSource: data.rateSource,
        tasaMostrada: data.tasaMostrada,
        tasaFinalEA: data.tasaFinalEA,
        motivoTasaFinal: data.motivoTasaFinal,
        bucketCuotaPm: data.bucketCuotaPm,
        bucketScorePm: data.bucketScorePm,
        probabilidadMora: data.probabilidadMora
      }
    });
  }

  function openConfirmModal() {
    if (!STATE.simulator.calculation) {
      Logger.calcError('No existe cálculo vivo para abrir modal', null);
      show(DOM.modalErrorBox);
      return;
    }

    hide(DOM.modalErrorBox);

    var calc = STATE.simulator.calculation;
    setText(DOM.modalRespuestaFinal, CONFIG.respuestaFinalTesla || '—');
    setText(DOM.modalPlazo, String(calc.plazo) + ' meses');
    setText(DOM.modalCuotaInicial, fmtMoney(calc.cuotaInicial));
    setText(DOM.modalTasa, calc.tasaMostrada);
    setText(DOM.modalCapital, fmtMoney(calc.capitalFinanciado));
    setText(DOM.modalCuotaTotal, fmtMoney(calc.cuotaTotal));

    show(DOM.modal);
    STATE.ui.modalOpen = true;

    Logger.functional('Modal de confirmación abierto', {
      snapshotOferta: STATE.simulator.snapshotOferta
    });
  }

  function closeConfirmModal() {
    hide(DOM.modal);
    STATE.ui.modalOpen = false;
  }

  function buildDecisionPayload(decisionType) {
    if (!STATE.simulator.calculation) {
      Logger.calcError('No existe cálculo para construir payload', {
        decisionType: decisionType
      });
      return null;
    }

    var calc = STATE.simulator.calculation;
    var recordId = getSafeRecordId();

    if (!recordId) {
      Logger.persistenceError('No se encontró recordId antes de persistir', {
        decisionType: decisionType,
        configNegocioId: CONFIG && CONFIG.negocioId ? CONFIG.negocioId : '',
        rawNegocioId: RAW && RAW.negocioId ? RAW.negocioId : ''
      });
      return null;
    }

    var decisionCliente = '';
    var decisionClienteTesla = decisionType || '';

    if (decisionType === 'aceptar') {
      decisionCliente = 'APROBADO';
    } else if (decisionType === 'reevaluar') {
      decisionCliente = 'REEVALUAR';
    } else if (decisionType === 'rechazar') {
      decisionCliente = 'RECHAZADO';
    } else {
      Logger.persistenceError('decisionType no reconocido en buildDecisionPayload', {
        decisionType: decisionType
      });
      return null;
    }

    var payload = {
      recordId: recordId,
      cuota_inicial_seleccionada: String(calc.cuotaInicial),
      tasa_selecionada: normalizeRate(calc.tasaMostrada),
      decision_cliente: decisionCliente,
      acepta_seguro_todo_riesgo: !!calc.seguros.autoSeleccionado,
      acepta_seguro_desempleo: !!calc.seguros.desempleoSeleccionado,
      decision_cliente_tesla: decisionClienteTesla,
      plazo_seleccionado_tesla: calc.plazo,
      cuota_inicial_seleccionada_tesla: calc.cuotaInicial,
      porcentaje_cuota_inicial_tesla: calc.porcentajeCuotaInicial,
      capital_financiado_tesla: calc.capitalFinanciado,

      rate_source_tesla: calc.rateSource || null,
      motivo_tasa_final_tesla: calc.motivoTasaFinal || null,
      bucket_cuota_pm_tesla: calc.bucketCuotaPm || null,
      bucket_score_pm_tesla: calc.bucketScorePm || null,
      probabilidad_mora_tesla: calc.probabilidadMora,
      tasa_ea_tesla: calc.tasaFinalEA,

      tasa_bucket_tesla: calc.tasaBucket,
      tasa_raw_tesla: calc.tasaRaw,
      tasa_normalizada_tesla: calc.tasaNormalizada,
      tasa_mostrada_tesla: calc.tasaMostrada,

      seguro_auto_seleccionado_tesla: calc.seguros.autoSeleccionado,
      seguro_desempleo_seleccionado_tesla: calc.seguros.desempleoSeleccionado,
      valor_seguro_vida_tesla: calc.seguros.valorSeguroVida,
      valor_seguro_auto_tesla: calc.seguros.valorSeguroAuto,
      valor_seguro_desempleo_tesla: calc.seguros.valorSeguroDesempleo,

      cuota_base_tesla: calc.cuotaBase,
      cuota_total_tesla: calc.cuotaTotal,

      snapshot_oferta_tesla: clone(STATE.simulator.snapshotOferta),
      pricing_engine_version_tesla: calc.engineVersion,
      rate_policy_result_tesla: calc.ratePolicyResult ? clone(calc.ratePolicyResult) : null,

      timestamp_decision_tesla: new Date().toISOString(),
      metadata_sesion_tesla: {
        session_id: STATE.session.id,
        started_at: STATE.session.startedAt,
        path: STATE.session.path,
        query: STATE.session.query,
        user_agent: STATE.session.userAgent,
        respuesta_final_normalizada: STATE.flow.normalized
      },
      cliente_id_tesla: CONFIG.clienteId || RAW.clienteId || '',
      negocio_id_tesla: recordId,
      respuesta_final_tesla: CONFIG.respuestaFinalTesla || RAW.respuestaFinalTesla || ''
    };

    Logger.technical('buildDecisionPayload.result', payload);
    return payload;
  }

  var TeslaPersistenceService = {
    persistDecision: function (payload) {
      return new Promise(function (resolve, reject) {
        var persistenceConfig = RAW.persistence || {};
        var enabled =
          typeof persistenceConfig.enabled === 'boolean'
            ? persistenceConfig.enabled
            : true;
        var endpointUrl = persistenceConfig.endpointUrl || DEFAULT_PERSISTENCE_ENDPOINT;
        var timeoutMs = Number(persistenceConfig.timeoutMs) || 12000;

        Logger.technical('persistDecision called', {
          enabled: enabled,
          endpointUrl: endpointUrl,
          timeoutMs: timeoutMs,
          payload: payload
        });

        if (!enabled || !endpointUrl) {
          reject({
            code: 'PERSISTENCE_NOT_CONFIGURED',
            message: 'No existe endpoint de persistencia configurado.',
            contract: {
              method: 'POST',
              endpoint: DEFAULT_PERSISTENCE_ENDPOINT,
              contentType: 'application/json',
              expectedBody: {
                recordId: 'string',
                cuota_inicial_seleccionada: 'string|number',
                tasa_selecionada: 'number',
                decision_cliente: 'string',
                acepta_seguro_todo_riesgo: 'boolean',
                acepta_seguro_desempleo: 'boolean',
                plazo_seleccionado_tesla: 'number',
                cuota_inicial_seleccionada_tesla: 'number',
                porcentaje_cuota_inicial_tesla: 'number',
                capital_financiado_tesla: 'number',
                cuota_base_tesla: 'number',
                cuota_total_tesla: 'number'
              }
            }
          });
          return;
        }

        var controller = new AbortController();
        var timer = setTimeout(function () {
          controller.abort();
        }, timeoutMs);

        Logger.technical('persistDecision.payload.final', payload);

        fetch(endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        })
          .then(function (response) {
            clearTimeout(timer);

            return response.text().then(function (text) {
              var parsed;
              try {
                parsed = text ? JSON.parse(text) : { ok: true };
              } catch (e) {
                parsed = { raw: text };
              }

              if (!response.ok) {
                throw {
                  code: 'PERSISTENCE_HTTP_ERROR',
                  status: response.status,
                  responseBody: parsed
                };
              }

              return parsed;
            });
          })
          .then(function (data) {
            resolve({
              ok: true,
              data: data
            });
          })
          .catch(function (err) {
            clearTimeout(timer);
            reject({
              code: err && err.code ? err.code : 'PERSISTENCE_FETCH_ERROR',
              message: err && err.message ? err.message : 'Error desconocido persistiendo la decisión.',
              detail: err
            });
          });
      });
    }
  };

  window.TeslaPersistenceService = TeslaPersistenceService;

  function persistDecisionWithPolicy(payload) {
    return TeslaPersistenceService.persistDecision(payload)
      .then(function (result) {
        STATE.decision.persistenceResult = result;
        Logger.functional('Persistencia exitosa de decisión', result);
        return result;
      })
      .catch(function (err) {
        STATE.decision.persistenceResult = {
          ok: false,
          error: err
        };

        Logger.persistenceError('Falló persistencia de decisión', err);

        var requireBeforeAdvance =
          RAW.persistence && typeof RAW.persistence.requireBeforeAdvance === 'boolean'
            ? !!RAW.persistence.requireBeforeAdvance
            : true;

        if (requireBeforeAdvance) {
          throw err;
        }

        return {
          ok: false,
          warning: true,
          error: err
        };
      });
  }

  function continuarFlujoAceptacion() {
    if (!STATE.flow.acceptFormReady) {
      Logger.configError('No se puede continuar aceptación: formulario no disponible', {
        flow: STATE.flow
      });
      show(DOM.acceptFormConfigError);
      if (DOM.acceptFormErrorDetail) {
        DOM.acceptFormErrorDetail.textContent = 'FormId: ' + (STATE.flow.acceptFormId || '(vacío)') + '. Portal: 44539823.';
        DOM.acceptFormErrorDetail.classList.remove('hide');
      }
      return;
    }

    mostrarPagina(3);
    scrollTopNow();

    ensureAcceptFormRendered().catch(function () {});
  }

  function handleAceptarOfertaClick() {
    if (STATE.ui.acceptBusy) {
      Logger.warn('Intento doble de aceptar oferta bloqueado', null);
      return;
    }

    if (!STATE.simulator.calculation) {
      Logger.calcError('Intento de aceptar sin cálculo vigente', null);
      return;
    }

    openConfirmModal();
  }

  function handleConfirmAceptarOferta() {
    if (STATE.ui.acceptBusy) {
      Logger.warn('Doble confirmación bloqueada', null);
      return;
    }

    var payload = buildDecisionPayload('aceptar');
    if (!payload) {
      Logger.calcError('No fue posible construir payload de aceptación', null);
      show(DOM.modalErrorBox);
      return;
    }

    STATE.ui.acceptBusy = true;
    STATE.decision.type = 'aceptar';
    STATE.decision.status = 'submitting';
    STATE.decision.payload = payload;

    setBusy(DOM.btnFirmar, true, 'PROCESANDO...');
    setBusy(DOM.btnModalConfirm, true, 'CONFIRMANDO...');

    persistDecisionWithPolicy(payload)
      .then(function () {
        STATE.decision.status = 'submitted';
        STATE.decision.submittedAt = new Date().toISOString();
        closeConfirmModal();
        continuarFlujoAceptacion();
      })
      .catch(function (err) {
        STATE.decision.status = 'error';
        show(DOM.modalErrorBox);
        DOM.modalErrorBox.textContent = 'No fue posible registrar la decisión antes de continuar.';
        Logger.persistenceError('Bloqueo de aceptación por persistencia requerida', err);
      })
      .finally(function () {
        STATE.ui.acceptBusy = false;
        setBusy(DOM.btnFirmar, false);
        setBusy(DOM.btnModalConfirm, false);
      });
  }

  function handleReevaluarClick() {
    if (STATE.ui.reevaluarBusy) {
      Logger.warn('Intento doble de re-evaluar bloqueado', null);
      return;
    }

    var payload = buildDecisionPayload('reevaluar');
    if (!payload) {
      Logger.calcError('No fue posible construir payload de re-evaluación', null);
      return;
    }

    STATE.ui.reevaluarBusy = true;
    STATE.decision.type = 'reevaluar';
    STATE.decision.status = 'submitting';
    STATE.decision.payload = payload;

    setBusy(DOM.btnDesistir, true, 'PROCESANDO...');

    persistDecisionWithPolicy(payload)
      .then(function () {
        STATE.decision.status = 'submitted';
        STATE.decision.submittedAt = new Date().toISOString();
        mostrarPagina(4);
        scrollTopNow();
        return ensureReevaluarFormRendered();
      })
      .catch(function (err) {
        Logger.persistenceError('Error en flujo de re-evaluación', err);
      })
      .finally(function () {
        STATE.ui.reevaluarBusy = false;
        setBusy(DOM.btnDesistir, false);
      });
  }

  function handleRechazarClick() {
    if (STATE.ui.rejectBusy) {
      Logger.warn('Intento doble de rechazo bloqueado', null);
      return;
    }

    var payload = buildDecisionPayload('rechazar');
    if (!payload) {
      Logger.calcError('No fue posible construir payload de rechazo', null);
      return;
    }

    STATE.ui.rejectBusy = true;
    STATE.decision.type = 'rechazar';
    STATE.decision.status = 'submitting';
    STATE.decision.payload = payload;

    setBusy(DOM.btnRechazar, true, 'PROCESANDO...');

    persistDecisionWithPolicy(payload)
      .then(function () {
        STATE.decision.status = 'submitted';
        STATE.decision.submittedAt = new Date().toISOString();
        mostrarPagina(5);
        scrollTopNow();
        return ensureDesistirFormRendered();
      })
      .catch(function (err) {
        Logger.persistenceError('Error en flujo de rechazo', err);
      })
      .finally(function () {
        STATE.ui.rejectBusy = false;
        setBusy(DOM.btnRechazar, false);
      });
  }

  function bindCalculadoraEventos() {
    if (DOM.inputPlazo) {
      DOM.inputPlazo.addEventListener('change', function () {
        Logger.functional('Cambio de plazo', { plazo: Number(DOM.inputPlazo.value) });
        actualizarRestriccionesPorPlazo();
        calcularYRenderizarOferta('change_plazo');
      });
    }

    if (DOM.rangeInicial) {
      DOM.rangeInicial.addEventListener('input', function () {
        calcularYRenderizarOferta('input_cuota_inicial');
      });
      DOM.rangeInicial.addEventListener('change', function () {
        calcularYRenderizarOferta('change_cuota_inicial');
      });
    }

    if (DOM.checkAuto) {
      DOM.checkAuto.addEventListener('change', function () {
        Logger.functional('Cambio seguro auto', { checked: DOM.checkAuto.checked });
        calcularYRenderizarOferta('change_seguro_auto');
      });
    }

    if (DOM.checkDesempleo) {
      DOM.checkDesempleo.addEventListener('change', function () {
        Logger.functional('Cambio seguro desempleo', { checked: DOM.checkDesempleo.checked });
        calcularYRenderizarOferta('change_seguro_desempleo');
      });
    }
  }

  function bindBotones() {
    if (DOM.btnFirmar) {
      DOM.btnFirmar.addEventListener('click', handleAceptarOfertaClick);
    }

    if (DOM.btnDesistir) {
      DOM.btnDesistir.addEventListener('click', handleReevaluarClick);
    }

    if (DOM.btnRechazar) {
      DOM.btnRechazar.addEventListener('click', handleRechazarClick);
    }
    if (DOM.btnVolverInicio) {
      DOM.btnVolverInicio.addEventListener('click', function () {
        mostrarPagina(1);
      });
    }

    if (DOM.btnModalCancel) {
      DOM.btnModalCancel.addEventListener('click', closeConfirmModal);
    }

    if (DOM.btnModalConfirm) {
      DOM.btnModalConfirm.addEventListener('click', handleConfirmAceptarOferta);
    }

    if (DOM.modal) {
      DOM.modal.addEventListener('click', function (event) {
        if (event.target === DOM.modal) {
          closeConfirmModal();
        }
      });
    }
  }

  function initConfiguracionYFlujo() {
    var validation = PricingEngine.validarConfiguracion(CONFIG);
    Logger.technical('INIT CONFIG', CONFIG);
    Logger.technical('VALIDACION CONFIG', validation);

    if (!validation.ok) {
      mostrarErrorGeneral(
        'Ocurrió un error al cargar la oferta. Faltan datos críticos de configuración.',
        validation.errors
      );
      return false;
    }

    var esReferidoPorConfig = RAW.esReferido === true || (typeof RAW.esReferido === 'string' && RAW.esReferido.toLowerCase() === 'true');
    var respuestaRaw = String(CONFIG.respuestaFinalTesla || RAW.respuestaFinalTesla || '').trim();
    var esReferidoPorTexto = respuestaRaw.toUpperCase().indexOf('REFERIDO') !== -1;
    var esReferido = esReferidoPorConfig || esReferidoPorTexto;

    var flowResult;
    if (esReferido) {
      flowResult = {
        raw: respuestaRaw,
        normalized: 'referido',
        acceptFormId: (RAW.forms && RAW.forms.aceptar && RAW.forms.aceptar.referido) || '',
        acceptTitle: 'FLUJO REFERIDO',
        acceptDescription: 'Tu solicitud ha sido referida. Continúa con la información necesaria para tu crédito de vehículo.',
        flowBadge: 'Flujo referido',
        canAccept: !!(RAW.forms && RAW.forms.aceptar && RAW.forms.aceptar.referido)
      };
      Logger.technical('REFERIDO detectado al inicio', flowResult);
    } else {
      flowResult = resolverFlujoPorRespuestaFinal();
    Logger.technical('resolverFlujoPorRespuestaFinal', flowResult);
    if (flowResult.normalized === 'desconocido') {
        var rawDesconocido = String(flowResult.raw || respuestaRaw || '').trim();
        var esReferidoDesconocido = rawDesconocido.toUpperCase().indexOf('REFERIDO') !== -1;
        flowResult = {
          raw: rawDesconocido,
          normalized: esReferidoDesconocido ? 'referido' : 'otro',
          acceptFormId: '',
          acceptTitle: esReferidoDesconocido ? 'FLUJO REFERIDO' : 'CONTINÚA CON TU SOLICITUD',
          acceptDescription: esReferidoDesconocido ? 'Tu solicitud ha sido referida. Continúa con la información necesaria para tu crédito de vehículo.' : 'Continúa registrando la información necesaria para obtener tu crédito de vehículo.',
          flowBadge: esReferidoDesconocido ? 'Flujo referido' : (rawDesconocido || 'Otro'),
          canAccept: false
        };
        Logger.technical('Flujo desconocido tratado como oferta', flowResult);
      }
    }

    configurarFormularioAceptacion(flowResult);
    return true;
  }

  function initCalculadora() {
    renderValorVehiculo();
    renderPlazosDisponibles();
    actualizarRestriccionesPorPlazo();
    calcularYRenderizarOferta('init');
    actualizarVisibilidadBotonReevaluar();
    bindCalculadoraEventos();
  }

  function initBlockedFlowIfNeeded() {
    Logger.technical('FLOW STATUS', FLOW_STATUS);

    if (!STATE.flow.blocked) {
      return false;
    }

    renderBlockedFlowPage();
    mostrarPagina(6);
    return true;
  }

  var initAlreadyRun = false;

  function init() {
    if (initAlreadyRun) {
      Logger.warn('init ya ejecutado, se omite segunda llamada', null);
      return;
    }
    initAlreadyRun = true;

    captureDom();
    clearDebugBox();

    var config = window.TESLA_CONFIG || {};
    Logger.technical('INIT RAW', config);
    Logger.technical('Negocio decision_cliente (desde objeto Negocios Tesla)', {
      decision_cliente: config.decisionCliente || ''
    });
    try {
      console.log(DEBUG_PREFIX + ' decision_cliente (Negocios Tesla):', config.decisionCliente || '');
    } catch (e) {}

    try {
      var rawDecisionCliente = config.decisionCliente;
      console.log(rawDecisionCliente);
      if(rawDecisionCliente === 'APROBADO' || rawDecisionCliente === 'REFERIDO' || rawDecisionCliente === 'PREAPROBADO'  || rawDecisionCliente === 'RECHAZADO'){
        alert("es diligenciado");
      }
    } catch (e) {
      Logger.warn('No se pudo evaluar decisionCliente en init', { error: String(e && e.message ? e.message : e) });
    }

    if (config.mostrarError === true) {
      mostrarPagina(7);
      if (DOM.mainFormContent) DOM.mainFormContent.classList.add('showing-page-7');
    }

    if (config.mostrarOferta && DOM.loginError) {
      hide(DOM.loginError);
    }

    initLoginButton();
    bindBotones();

    if (!config.mostrarOferta) {
      Logger.warn('mostrarOferta=false, no se inicializa la calculadora', null);
      if (config.mostrarError === true) {
        mostrarPagina(7);
        if (DOM.mainFormContent) DOM.mainFormContent.classList.add('showing-page-7');
      } else {
      mostrarPagina(1);
      }
      return;
    }

    var ok = initConfiguracionYFlujo();
    if (!ok) return;

    if (initBlockedFlowIfNeeded()) {
      return;
    }

    initCalculadora();
    if (DOM.loginError) hide(DOM.loginError);
    mostrarPagina(2);
  }

  function runInitWhenReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
  }
  function ensureDesistirFormRendered() {
    var desistirFormId = RAW.forms && RAW.forms.desistir ? RAW.forms.desistir : '';

    if (!desistirFormId) {
      if (DOM.desistirFormConfigError) show(DOM.desistirFormConfigError);
      if (DOM.desistirFormContainer) hide(DOM.desistirFormContainer);
      Logger.configError('No existe formulario de desistimiento configurado', null);
      return Promise.reject(new Error('Formulario de desistimiento no configurado.'));
    }

    if (!DOM.desistirFormFrame) {
      Logger.configError('No existe contenedor para formulario de desistimiento', null);
      return Promise.reject(new Error('Contenedor de desistimiento no disponible.'));
    }

    if (DOM.desistirFormContainer) show(DOM.desistirFormContainer);
    if (DOM.desistirFormConfigError) hide(DOM.desistirFormConfigError);

    DOM.desistirFormFrame.setAttribute('data-form-id', desistirFormId);
    DOM.desistirFormFrame.setAttribute('data-region', 'na1');
    DOM.desistirFormFrame.setAttribute('data-portal-id', '44539823');

    return renderHubspotForm(DOM.desistirFormFrame, desistirFormId)
      .then(function () {
        Logger.functional('Formulario de desistimiento renderizado', {
          formId: desistirFormId
        });
      })
      .catch(function (err) {
        if (DOM.desistirFormContainer) hide(DOM.desistirFormContainer);
        if (DOM.desistirFormConfigError) show(DOM.desistirFormConfigError);

        Logger.configError('Error renderizando formulario de desistimiento', {
          formId: desistirFormId,
          error: err && err.message ? err.message : String(err)
        });
        throw err;
      });
  }
  runInitWhenReady();

  window.TeslaVolverInicio = function () {
    mostrarPagina(1);
  };
})();