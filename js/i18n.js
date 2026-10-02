// Internationalization (UI only - station data stays as-is)
const I18N = {
    es: {
        radar: 'Radar GPS',
        stop_radar: 'Detener Radar',
        gps_error: 'Error de GPS',
        gps_error_msg: 'Error de GPS. Verifica los permisos de tu navegador.',
        connections: 'Conexiones',
        point_col: 'Punto',
        distance: 'Distancia',
        network: 'Red',
        route: 'Ruta',
        me: 'Yo',
        zone: 'Zona',
        area: 'Área: ',
        perim: 'Perímetro: ',
        vertex: 'Vértice',
        point: 'Pto',
        go: 'Ir',
        stations: 'Estaciones',
        coverage: 'Cobertura',
        download_csv: 'Descargar CSV',
        csv_none: 'No hay polígonos para exportar.',
        csv_polygon: 'Polígono',
        csv_area: 'Área (km2)',
        csv_perim: 'Perímetro (km)',
        csv_verts: 'Vértice,Latitud,Longitud,UTM_Este,UTM_Norte,Zona_UTM',
        scale_label: 'Escala 1:',
        search_ph: 'Buscar...',
        filters_title: 'Filtrar Redes:',
        measure_mode_title: 'MODO MEDICIÓN',
        measure_instruction: 'Haz clic en el mapa para trazar.',
        clear: 'Limpiar',
        save: 'Guardar',
        poly_name_ph: 'Nombre (ej. Zona A)',
        buffer_label: 'Radio Cobertura (km):',
        gps_panel_title: 'ESTACIONES CERCANAS EN TIEMPO REAL',
        connect_to: 'Conectar a:',
        me_btn: 'Yo',
        est_btn: 'Est.',
        table_btn: 'Ver Tabla',
        loader_title: 'BUSCANDO SEÑAL GPS',
        loader_subtitle: 'por favor espera...',
        scale_fix_title: 'Fijar Escala Manual',
        scale_edit_label: 'Escala 1 :',
        scale_go: 'Ir',
        zen_title: 'Haz clic en cualquier parte para restaurar la interfaz',
        filter_btn_title: 'Filtros',
        layers_btn_title: 'Administrar Capas y Exportar',
        measure_btn_title: 'Medir Área y Perímetro',
        zen_btn_title: 'Modo Informe (Limpia la pantalla)',
        buffer_btn_title: 'Cobertura',
        theme_btn_title: 'Modo Oscuro',
        lang_btn_title: 'Idioma / Language'
    },
    en: {
        radar: 'GPS Radar',
        stop_radar: 'Stop Radar',
        gps_error: 'GPS Error',
        gps_error_msg: 'GPS error. Check your browser permissions.',
        connections: 'Connections',
        point_col: 'Point',
        distance: 'Distance',
        network: 'Network',
        route: 'Route',
        me: 'Me',
        zone: 'Zone',
        area: 'Area: ',
        perim: 'Perimeter: ',
        vertex: 'Vertex',
        point: 'Pt',
        go: 'Go',
        stations: 'Stations',
        coverage: 'Coverage',
        download_csv: 'Download CSV',
        csv_none: 'No polygons to export.',
        csv_polygon: 'Polygon',
        csv_area: 'Area (km2)',
        csv_perim: 'Perimeter (km)',
        csv_verts: 'Vertex,Latitude,Longitude,UTM_East,UTM_North,UTM_Zone',
        scale_label: 'Scale 1:',
        search_ph: 'Search...',
        filters_title: 'Filter Networks:',
        measure_mode_title: 'MEASUREMENT MODE',
        measure_instruction: 'Click on the map to draw.',
        clear: 'Clear',
        save: 'Save',
        poly_name_ph: 'Name (e.g. Zone A)',
        buffer_label: 'Coverage Radius (km):',
        gps_panel_title: 'NEARBY STATIONS IN REAL TIME',
        connect_to: 'Connect to:',
        me_btn: 'Me',
        est_btn: 'Sta.',
        table_btn: 'View Table',
        loader_title: 'ACQUIRING GPS SIGNAL',
        loader_subtitle: 'please wait...',
        scale_fix_title: 'Set Manual Scale',
        scale_edit_label: 'Scale 1 :',
        scale_go: 'Go',
        zen_title: 'Click anywhere to restore the interface',
        filter_btn_title: 'Filters',
        layers_btn_title: 'Manage Layers & Export',
        measure_btn_title: 'Measure Area & Perimeter',
        zen_btn_title: 'Report Mode (Clears the screen)',
        buffer_btn_title: 'Coverage',
        theme_btn_title: 'Dark Mode',
        lang_btn_title: 'Language / Idioma'
    }
};

var lang = 'es';

function t(key) {
    return (I18N[lang] && I18N[lang][key]) || I18N.es[key] || key;
}

function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) { el.title = t(el.dataset.i18nTitle); });
    var btnText = document.getElementById('btn_text');
    if (btnText) btnText.innerText = (typeof isTracking !== 'undefined' && isTracking) ? t('stop_radar') : t('radar');
    var langBtn = document.getElementById('lang_toggle');
    if (langBtn) langBtn.innerText = lang.toUpperCase();
    if (typeof updateLayersPanel === 'function' && document.getElementById('capas_panel').innerHTML !== '') updateLayersPanel();
    if (typeof isTracking !== 'undefined' && isTracking && typeof drawNearestStations === 'function' && typeof globalUserLatLng !== 'undefined' && globalUserLatLng) drawNearestStations(globalUserLatLng);
}

window.toggleLang = function () {
    lang = (lang === 'es') ? 'en' : 'es';
    applyI18n();
};
