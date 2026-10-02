    var ml = null, userMarker = null, clusterGroup = null, coverageGroup = null, measureGroup = null;
    var linesBg = [], linesFg = [], labels = [];
    var watchId = null, isTracking = false, isDark = false, isMeasuring = false;
    var globalUserLatLng = null, globalNearestCoords = null, currentRadius = 0;
    var activeNetworks = new Set(['GA', 'JPL', 'Geocom', 'IGS', 'CSN']);
    var measurePts = [];
    var savedPolygonsData = {}; var polyIdCounter = 0;
    var themeColors = {};

    function updateThemeCache() {
        var cs = getComputedStyle(document.body);
        themeColors.lFg = cs.getPropertyValue('--line-fg').trim();
        themeColors.lBg = cs.getPropertyValue('--line-bg').trim();
        themeColors.pC = cs.getPropertyValue('--primary-color').trim();
        themeColors.tS = cs.getPropertyValue('--text-shadow').trim();
    }

    function latLonToUTM(lat, lon) {
        var a = 6378137.0, ecc = 0.0033528106647474805, k0 = 0.9996;
        var latRad = lat * Math.PI / 180.0, lonRad = lon * Math.PI / 180.0;
        var zone = Math.floor((lon + 180.0) / 6) + 1;
        var lonOrigin = (zone - 1) * 6 - 180 + 3;
        var lonOriginRad = lonOrigin * Math.PI / 180.0;
        var eccPrimeSquared = (ecc) / (1 - ecc);
        var N = a / Math.sqrt(1 - ecc * Math.sin(latRad) * Math.sin(latRad));
        var T = Math.tan(latRad) * Math.tan(latRad);
        var C = eccPrimeSquared * Math.cos(latRad) * Math.cos(latRad);
        var A = Math.cos(latRad) * (lonRad - lonOriginRad);
        var M = a * ((1 - ecc / 4 - 3 * ecc * ecc / 64 - 5 * ecc * ecc * ecc / 256) * latRad - (3 * ecc / 8 + 3 * ecc * ecc / 32 + 45 * ecc * ecc * ecc / 1024) * Math.sin(2 * latRad) + (15 * ecc * ecc / 256 + 45 * ecc * ecc * ecc / 1024) * Math.sin(4 * latRad) - (35 * ecc * ecc * ecc / 3072) * Math.sin(6 * latRad));
        var e = k0 * N * (A + (1 - T + C) * A * A * A / 6 + (5 - 18 * T + T * T + 72 * C - 58 * eccPrimeSquared) * A * A * A * A * A / 120) + 500000.0;
        var n = k0 * (M + N * Math.tan(latRad) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24 + (61 - 58 * T + T * T + 600 * C - 330 * eccPrimeSquared) * A * A * A * A * A * A / 720));
        if (lat < 0) n += 10000000.0;
        var letters = "CDEFGHJKLMNPQRSTUVWXX";
        var lIdx = Math.max(0, Math.min(20, Math.floor((lat + 80) / 8)));
        return { e: e, n: n, zone: zone, letter: letters.charAt(lIdx) };
    }

    function fastHaversine(lat1, lon1, lat2, lon2) {
        var p = 0.017453292519943295;
        var c = Math.cos;
        var a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
        return 12742 * Math.asin(Math.sqrt(a)) * 1000;
    }

    window.activateZenMode = function() {
        document.querySelectorAll('.ui-container').forEach(el => el.style.opacity = '0');
        var zCtrl = document.querySelector('.leaflet-control-zoom'); if(zCtrl) zCtrl.style.display = 'none';
        document.getElementById('zen_overlay').style.display = 'block';
        document.getElementById('report_titles').style.display = 'flex';
    }
    window.exitZenMode = function() {
        document.querySelectorAll('.ui-container').forEach(el => el.style.opacity = '1');
        var zCtrl = document.querySelector('.leaflet-control-zoom'); if(zCtrl) zCtrl.style.display = 'block';
        document.getElementById('zen_overlay').style.display = 'none';
        document.getElementById('report_titles').style.display = 'none';
    }

    function updateScale() {
        if(!ml) return;
        var center = ml.getCenter(); var zoom = ml.getZoom();
        var metersPerPixel = (Math.cos(center.lat * Math.PI / 180) * 2 * Math.PI * 6378137) / (256 * Math.pow(2, zoom));
        var scaleFraction = Math.round(metersPerPixel * 3779.527);
        document.getElementById('scale_val_frac').innerText = 'Escala 1:' + scaleFraction.toLocaleString('es-CL');

        var maxWidth = 150; var maxMeters = maxWidth * metersPerPixel;
        var pow10 = Math.pow(10, (Math.floor(maxMeters) + '').length - 1);
        var d = maxMeters / pow10;
        var roundMeters = pow10 * (d >= 10 ? 10 : d >= 5 ? 5 : d >= 3 ? 3 : d >= 2 ? 2 : 1);

        var ratio = roundMeters / maxMeters;
        document.getElementById('scale_fill').style.width = (ratio * 100) + '%';
        document.getElementById('scale_val_km').innerText = roundMeters >= 1000 ? (roundMeters / 1000) + ' km' : roundMeters + ' m';
    }

    document.getElementById('btn_edit_scale').addEventListener('click', function() {
        var pnl = document.getElementById('scale_edit_panel'); pnl.style.display = pnl.style.display === 'none' ? 'flex' : 'none';
    });

    window.applyCustomScale = function() {
        var desiredScale = parseFloat(document.getElementById('custom_scale_input').value);
        if (!desiredScale || desiredScale <= 0 || !ml) return;
        var center = ml.getCenter();
        var constant = Math.cos(center.lat * Math.PI / 180) * 2 * Math.PI * 6378137 * 3779.527;
        var exactZoom = Math.log2(constant / (256 * desiredScale));
        ml.options.zoomSnap = 0; ml.setZoom(exactZoom);
        document.getElementById('scale_edit_panel').style.display = 'none';
    };

    window.exportCSV = function() {
        var keys = Object.keys(savedPolygonsData);
        if(keys.length === 0) return alert("No hay polígonos para exportar.");

        keys.forEach(function(id) {
            var poly = savedPolygonsData[id];
            var csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Poligono," + poly.name + "\n";
            csvContent += "Area (km2)," + poly.area + "\n";
            csvContent += "Perimetro (km)," + poly.perim + "\n\n";
            csvContent += "Vertice,Latitud,Longitud,UTM_Este,UTM_Norte,Zona_UTM\n";

            poly.pts.forEach(function(pt, index) {
                var utm = latLonToUTM(pt.lat, pt.lng);
                csvContent += (index + 1) + "," + pt.lat.toFixed(6) + "," + pt.lng.toFixed(6) + "," + utm.e.toFixed(2) + "," + utm.n.toFixed(2) + "," + utm.zone + utm.letter + "\n";
            });

            var encodedUri = encodeURI(csvContent);
            var link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", poly.name.replace(/\s+/g, '_') + ".csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    };

    var svgPin = '<svg height="28" width="28" viewBox="0 0 24 24" style="filter: drop-shadow(0px 3px 3px rgba(0,0,0,0.2));"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" style="fill: var(--primary-color); stroke: var(--pin-border); stroke-width: 1px;" /><circle cx="12" cy="9" r="3.5" fill="white"/></svg>';
    var uIconHtml = '<svg height="40" width="40" viewBox="0 0 40 40" style="overflow:visible;"><circle cx="20" cy="20" r="14" class="gps-aura"/><circle cx="20" cy="20" r="7" class="gps-core" stroke="white" stroke-width="2.5" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));"/></svg>';

    function togglePanel(id) { var el = document.getElementById(id); el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'flex' : 'none'; }
    window.goToLocation = function(lat, lon, isUser) { if(ml) { ml.setView([lat, lon], 15); if(!isUser) ml.eachLayer(function(l) { if(l.getLatLng && l.getLatLng().lat === lat && l.getLatLng().lng === lon && l.getPopup()) l.openPopup(); }); } };

    function calculateArea(pts) {
        var r = 6378137, area = 0, d2r = Math.PI / 180;
        for (var i = 0; i < pts.length; i++) {
            var p1 = pts[i], p2 = pts[(i + 1) % pts.length];
            area += (p2.lng - p1.lng) * d2r * (2 + Math.sin(p1.lat * d2r) + Math.sin(p2.lat * d2r));
        }
        return Math.abs(area * r * r / 2.0);
    }

    window.toggleMeasureMode = function() {
        isMeasuring = !isMeasuring;
        var btn = document.getElementById('btn_measure'), pnl = document.getElementById('measure_panel');
        if(isMeasuring) {
            btn.style.background = 'var(--primary-color)'; btn.style.color = 'white';
            pnl.style.display = 'block'; ml._container.style.cursor = 'crosshair';
            ml.on('click', onMapClickMeasure);
        } else {
            btn.style.background = ''; btn.style.color = '';
            pnl.style.display = 'none'; ml._container.style.cursor = '';
            ml.off('click', onMapClickMeasure); clearMeasurement();
        }
    };

    function onMapClickMeasure(e) { measurePts.push(e.latlng); drawMeasurement(); }
    window.clearMeasurement = function() { measurePts = []; drawMeasurement(); };

    function drawEdgeLabel(p1, p2, dist, targetGroup) {
        var mid = L.latLng((p1.lat + p2.lat)/2, (p1.lng + p2.lng)/2);
        var pt1 = ml.latLngToLayerPoint(p1), pt2 = ml.latLngToLayerPoint(p2);
        var angle = Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x) * (180 / Math.PI);
        if (angle > 90 || angle < -90) angle += 180;
        var html = '<div class="measure-label" style="transform: translate(-50%, -50%) rotate(' + angle + 'deg); padding-bottom:10px;">' + (dist/1000).toFixed(2) + ' km</div>';
        L.marker(mid, {icon: L.divIcon({html: html, className: '', iconSize: [0,0]})}).addTo(targetGroup);
    }

    function updateMeasurePanel() {
        var html = '<div style="max-height:130px; overflow-y:auto; margin-bottom:8px; text-align:left;">';
        measurePts.forEach(function(pt, i) {
            var utm = latLonToUTM(pt.lat, pt.lng);
            html += '<div style="border-bottom:1px solid var(--glass-border); padding:5px 0;"><div style="font-weight:600; color:var(--primary-color); display:flex; justify-content:space-between;"><span>📍 Pto '+(i+1)+'</span><span style="cursor:pointer;" onclick="goToLocation('+pt.lat+', '+pt.lng+', true)">🎯 Ir</span></div><div style="font-size:9.5px; line-height:1.3; color:var(--text-main);">Lat: '+pt.lat.toFixed(5)+', Lon: '+pt.lng.toFixed(5)+'<br>UTM: '+utm.e.toFixed(1)+' E, '+utm.n.toFixed(1)+' N (Z '+utm.zone+utm.letter+')</div></div>';
        });
        document.getElementById('measure_points_list').innerHTML = html + '</div>';
        var saveBtn = document.getElementById('save_poly_btn');
        saveBtn.disabled = measurePts.length < 3; saveBtn.style.opacity = measurePts.length < 3 ? '0.5' : '1';
    }

    function drawMeasurement() {
        if(!measureGroup) return;
        measureGroup.clearLayers(); updateMeasurePanel();
        if(measurePts.length === 0) return;

        measurePts.forEach(function(pt) { L.circleMarker(pt, {radius: 4, className: 'measure-point', fillOpacity: 1, weight: 2}).addTo(measureGroup); });

        if(measurePts.length >= 3) {
            var poly = L.polygon(measurePts, {className: 'poly-measure', weight: 2.5, fillOpacity: 0.1}).addTo(measureGroup);
            var totalDist = 0;
            for(var i=0; i<measurePts.length; i++) {
                var p1 = measurePts[i], p2 = measurePts[(i+1)%measurePts.length], d = p1.distanceTo(p2);
                totalDist += d; drawEdgeLabel(p1, p2, d, measureGroup);
            }
            var centerHtml = '<div class="measure-center-label">Área: ' + (calculateArea(measurePts)/1000000).toFixed(2) + ' km²<br>Perímetro: ' + (totalDist/1000).toFixed(2) + ' km</div>';
            L.marker(poly.getBounds().getCenter(), {icon: L.divIcon({html: centerHtml, className: '', iconSize: [0,0]})}).addTo(measureGroup);
        } else if(measurePts.length === 2) {
            L.polyline(measurePts, {className: 'poly-measure-line', weight: 2.5}).addTo(measureGroup);
            drawEdgeLabel(measurePts[0], measurePts[1], measurePts[0].distanceTo(measurePts[1]), measureGroup);
        }
    }

    window.updateLayersPanel = function() {
        var html = '<label style="display:flex; align-items:center; gap:8px; cursor:pointer;"><input type="checkbox" id="chk_estaciones" '+(ml.hasLayer(clusterGroup)?'checked':'')+' onchange="if(this.checked) ml.addLayer(clusterGroup); else ml.removeLayer(clusterGroup);" style="accent-color: var(--primary-color);"> 📡 Estaciones</label><label style="display:flex; align-items:center; gap:8px; cursor:pointer;"><input type="checkbox" id="chk_cobertura" '+(ml.hasLayer(coverageGroup)?'checked':'')+' onchange="if(this.checked) ml.addLayer(coverageGroup); else ml.removeLayer(coverageGroup);" style="accent-color: var(--primary-color);"> 🔵 Cobertura</label>';

        if(Object.keys(savedPolygonsData).length > 0) {
            html += '<hr style="border:0; border-top:1px solid var(--glass-border); margin:5px 0;">';
            for(var id in savedPolygonsData) {
                var poly = savedPolygonsData[id], isCh = ml.hasLayer(poly.group) ? 'checked' : '';
                html += '<div style="display:flex; justify-content:space-between; align-items:center;"><label style="display:flex; align-items:center; gap:8px; cursor:pointer;"><input type="checkbox" '+isCh+' onchange="toggleSavedPoly(\''+id+'\', this)" style="accent-color: var(--primary-color);"> 📐 '+poly.name+'</label><span onclick="deleteSavedPoly(\''+id+'\')" style="cursor:pointer; color:#ff4757; font-size:14px;" title="Eliminar">🗑️</span></div>';
            }
            html += '<button onclick="exportCSV()" class="nav-btn" style="margin-top:10px; width:100%; border:1px solid var(--primary-color); padding:5px 0;">💾 Descargar CSV</button>';
        }
        document.getElementById('capas_panel').innerHTML = html;
    }

    window.savePolygon = function() {
        var name = document.getElementById('poly_name_input').value || 'Zona ' + (polyIdCounter+1);
        var pId = 'poly_' + polyIdCounter++;
        var newGrp = L.layerGroup().addTo(ml);

        var areaKm2 = (calculateArea(measurePts)/1000000).toFixed(2);
        var totalDist = 0;
        var poly = L.polygon(measurePts, {className: 'poly-measure', weight: 2.5, fillOpacity: 0.15}).addTo(newGrp);

        for(var i=0; i<measurePts.length; i++) {
            var p1 = measurePts[i], p2 = measurePts[(i+1)%measurePts.length], d = p1.distanceTo(p2);
            totalDist += d; drawEdgeLabel(p1, p2, d, newGrp);
            L.circleMarker(p1, {radius: 4, className: 'measure-point', fillOpacity: 1, weight: 2}).addTo(newGrp);
        }
        var perimKm = (totalDist/1000).toFixed(2);

        var centerHtml = '<div class="measure-center-label">Área: ' + areaKm2 + ' km²<br>Perímetro: ' + perimKm + ' km</div>';
        L.marker(poly.getBounds().getCenter(), {icon: L.divIcon({html: centerHtml, className: '', iconSize: [0,0]})}).addTo(newGrp);

        var popupHtml = '<div style="font-family:var(--font-main); font-size:11px; min-width:200px;">';
        popupHtml += '<h4 style="margin:0 0 5px 0; color:var(--primary-color); border-bottom:1px solid var(--glass-border); padding-bottom:5px;">📐 ' + name + '</h4>';
        popupHtml += '<b>Área:</b> ' + areaKm2 + ' km²<br><b>Perímetro:</b> ' + perimKm + ' km<br><br>';
        popupHtml += '<div style="max-height:120px; overflow-y:auto;">';
        measurePts.forEach(function(pt, i) {
            var utm = latLonToUTM(pt.lat, pt.lng);
            popupHtml += '<b>Vértice '+(i+1)+':</b> ' + pt.lat.toFixed(5) + ', ' + pt.lng.toFixed(5) + '<br>';
            popupHtml += '<span style="color:var(--text-muted); font-size:9.5px;">UTM: '+utm.e.toFixed(1)+' E, '+utm.n.toFixed(1)+' N (Z '+utm.zone+utm.letter+')</span><br><hr style="border:0; border-top:1px solid var(--glass-border); margin:3px 0;">';
        });
        popupHtml += '</div></div>';
        poly.bindPopup(popupHtml);

        savedPolygonsData[pId] = { group: newGrp, name: name, area: areaKm2, perim: perimKm, pts: measurePts.slice() };
        updateLayersPanel(); clearMeasurement(); document.getElementById('poly_name_input').value = '';
    }

    window.toggleSavedPoly = function(id, cb) { if(cb.checked) ml.addLayer(savedPolygonsData[id].group); else ml.removeLayer(savedPolygonsData[id].group); }
    window.deleteSavedPoly = function(id) { ml.removeLayer(savedPolygonsData[id].group); delete savedPolygonsData[id]; updateLayersPanel(); }

    window.toggleNetwork = function(red, btn) {
        if(activeNetworks.has(red)) { activeNetworks.delete(red); btn.classList.remove('active'); }
        else { activeNetworks.add(red); btn.classList.add('active'); }
        renderMapElements();
        if (isTracking && globalUserLatLng) drawNearestStations(globalUserLatLng);
    };

        ml = map;
        if (ml) {
            updateThemeCache();
            measureGroup = L.layerGroup().addTo(ml);
            clusterGroup = L.markerClusterGroup({ iconCreateFunction: function(c) { return L.divIcon({ html: '<div class="custom-cluster">' + c.getChildCount() + '</div>', className: '', iconSize: [35, 35] }); }, maxClusterRadius: 45 });
            coverageGroup = L.layerGroup();
            ml.addLayer(clusterGroup); ml.addLayer(coverageGroup);

            window.renderMapElements = function() {
                clusterGroup.clearLayers(); coverageGroup.clearLayers();
                for (var k in datos_estaciones) {
                    var e = datos_estaciones[k];
                    if (activeNetworks.has(e.red)) {
                        var m = L.marker([e.lat, e.lon], { icon: L.divIcon({html: svgPin, className: '', iconSize: [28,28], iconAnchor: [14,28]}) }).bindPopup("<b>" + k + "</b><br>" + e.red + "<br>Sats: " + e.sats);
                        clusterGroup.addLayer(m);
                        coverageGroup.addLayer(L.circle([e.lat, e.lon], { radius: currentRadius, color: themeColors.pC, fillColor: themeColors.pC, weight: 0.5, fillOpacity: 0.1 }));
                    }
                }
            };
            renderMapElements(); updateLayersPanel();
            ml.on('moveend zoomend', updateScale); updateScale();

            var baseTile = null; ml.eachLayer(function(l) { if (l instanceof L.TileLayer) baseTile = l; });

            document.getElementById('theme_toggle').addEventListener('click', function() {
                isDark = !isDark; document.body.classList.toggle('dark-mode', isDark);
                document.getElementById('theme_icon').innerText = isDark ? '🌙' : '☀️';
                document.getElementById('theme_icon').style.filter = isDark ? 'none' : 'grayscale(100%)';
                if (baseTile) baseTile.setUrl(isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_472b_1_07b0ad5df523954aaa77d469' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=cb1_472b_1_07b0ad5df523954aaa77d469');
                updateThemeCache(); renderMapElements();
                if(measurePts.length > 0) drawMeasurement();
                if (isTracking && globalUserLatLng) drawNearestStations(globalUserLatLng);
            });

            document.getElementById('buscador').addEventListener('input', function(e) {
                var n = e.target.value.toUpperCase();
                if (datos_estaciones[n] && activeNetworks.has(datos_estaciones[n].red)) { ml.setView([datos_estaciones[n].lat, datos_estaciones[n].lon], 14); this.blur(); }
            });

            document.getElementById('buffer_input').addEventListener('input', function(e) {
                var v = parseFloat(e.target.value); if(isNaN(v) || v < 0) v = 0;
                currentRadius = v * 1000; coverageGroup.eachLayer(function(l) { l.setRadius(currentRadius); });
            });

            document.getElementById('center_me_btn').addEventListener('click', function() { if(globalUserLatLng) ml.setView(globalUserLatLng, 15); });
            document.getElementById('center_station_btn').addEventListener('click', function() { if(globalNearestCoords) ml.setView(globalNearestCoords, 15); });

            function clearLines() {
                linesBg.forEach(l => ml.removeLayer(l));
                linesFg.forEach(l => ml.removeLayer(l));
                labels.forEach(l => ml.removeLayer(l));
                linesBg = []; linesFg = []; labels = [];
            }

            function drawNearestStations(uLatLng) {
                var numSt = parseInt(document.getElementById('num_stations').value) || 0;
                if (numSt === 0) {
                    clearLines();
                    document.getElementById('table_content').innerHTML = '';
                    return;
                }

                var uLat = uLatLng.lat, uLon = uLatLng.lng;
                var dists = [];

                for (var k in datos_estaciones) {
                    var est = datos_estaciones[k];
                    if (!activeNetworks.has(est.red)) continue;
                    dists.push({ name: k, lat: est.lat, lon: est.lon, dist: fastHaversine(uLat, uLon, est.lat, est.lon), red: est.red });
                }

                dists.sort((a, b) => a.dist - b.dist);
                var tops = dists.slice(0, numSt);

                clearLines();
                if (tops.length > 0) globalNearestCoords = L.latLng(tops[0].lat, tops[0].lon);

                var tHtml = '<h4 style="margin:0 0 12px 0; font-size:13px; font-weight:600; text-align:center;">📍 Conexiones</h4>' +
                            '<table style="width:100%; border-collapse:collapse; font-size:11px; text-align:left;">' +
                            '<tr style="border-bottom:1px solid var(--primary-color);"><th style="padding-bottom:5px;">Punto</th><th style="padding-bottom:5px;">Distancia</th><th style="padding-bottom:5px;">Red</th><th style="padding-bottom:5px;">Ruta</th></tr>' +
                            '<tr class="stations-table-row" onclick="goToLocation(' + uLat + ',' + uLon + ',true)"><td style="padding:6px 2px;">👤 Yo</td><td style="color:var(--primary-color);font-weight:bold;">0 km</td><td style="color:var(--text-muted);">-</td><td>-</td></tr>';

                tops.forEach(function(st) {
                    var stCoords = L.latLng(st.lat, st.lon);
                    linesBg.push(L.polyline([uLatLng, stCoords], { color: themeColors.lBg, weight: 4.5, opacity: 0.9 }).addTo(ml));
                    linesFg.push(L.polyline([uLatLng, stCoords], { color: themeColors.lFg, dashArray: '5,8', weight: 2, opacity: 1 }).addTo(ml));

                    var dKm = (st.dist / 1000).toFixed(2);
                    var tLab = '<div style="color:' + themeColors.pC + ';font-weight:600;font-size:11px;text-shadow:' + themeColors.tS + ';position:absolute;transform:translate(-50%,-50%);width:70px;text-align:center;">' + dKm + ' km</div>';
                    labels.push(L.marker([(uLat + st.lat)/2, (uLon + st.lon)/2], { icon: L.divIcon({ html: tLab, className: '', iconSize: [0, 0] }), interactive: false }).addTo(ml));

                    var mapsUrl = 'https://www.google.com/maps/dir/?api=1&origin=' + uLat + ',' + uLon + '&destination=' + st.lat + ',' + st.lon + '&travelmode=driving';
                    tHtml += '<tr class="stations-table-row" onclick="goToLocation(' + st.lat + ',' + st.lon + ',false)">' +
                             '<td style="padding:6px 2px;">📡 ' + st.name + '</td><td>' + dKm + ' km</td><td style="color:var(--text-muted);">' + st.red + '</td>' +
                             '<td><a href="' + mapsUrl + '" target="_blank" title="Google Maps" style="text-decoration:none;font-size:14px;">🚗</a></td></tr>';
                });

                tHtml += '</table>';
                document.getElementById('table_content').innerHTML = tHtml;
            }

            // AUTO-REFRESCO AL CAMBIAR NÚMERO DE ESTACIONES (Reacciona automáticamente)
            document.getElementById('num_stations').addEventListener('input', function() {
                if (isTracking && globalUserLatLng) {
                    drawNearestStations(globalUserLatLng);
                }
            });

            document.getElementById('go_btn').addEventListener('click', function() {
                var btnText = document.getElementById('btn_text'), btnIcon = document.getElementById('btn_icon'), gpsPanel = document.getElementById('gps_panel'), tableContainer = document.getElementById('stations_table_container');
                if (!navigator.geolocation) { alert("Error de GPS"); return; }

                if (isTracking) {
                    navigator.geolocation.clearWatch(watchId);
                    isTracking = false; // <--- AQUÍ SE APAGA CORRECTAMENTE
                    btnText.innerText = "Radar GPS"; btnIcon.innerText = "📍";
                    gpsPanel.style.display = 'none'; tableContainer.style.display = 'none';
                    this.style.background = 'var(--primary-color)'; this.style.color = 'white';
                    if (userMarker) { ml.removeLayer(userMarker); userMarker = null; }
                    clearLines(); globalUserLatLng = null; globalNearestCoords = null;
                } else {
                    isTracking = true; // <--- EL BUG ESTABA AQUÍ (faltaba encenderlo)
                    document.getElementById('num_stations').value = "1"; // Auto-conecta a 1 estación al iniciar

                    btnText.innerText = "Detener Radar"; btnIcon.innerText = "🛑";
                    this.style.background = 'var(--glass-bg)'; this.style.color = 'var(--text-main)';
                    var firstLock = true;

                    var loader = document.getElementById('loader_overlay');
                    loader.style.display = 'flex';

                    watchId = navigator.geolocation.watchPosition(function(pos) {
                        var currentLatLng = L.latLng(pos.coords.latitude, pos.coords.longitude);

                        // Tolerancia de 15 metros para no saturar los gráficos si estás casi quieto
                        if (globalUserLatLng && globalUserLatLng.distanceTo(currentLatLng) < 15) {
                            if (userMarker) userMarker.setLatLng(currentLatLng);
                            if (firstLock) loader.style.display = 'none';
                            return;
                        }

                        globalUserLatLng = currentLatLng;
                        gpsPanel.style.display = 'flex';
                        tableContainer.style.display = 'block';

                        if (firstLock) {
                            ml.setView([currentLatLng.lat, currentLatLng.lng], 13);
                            firstLock = false;
                        }

                        if (userMarker) {
                            userMarker.setLatLng(currentLatLng);
                        } else {
                            userMarker = L.marker(currentLatLng, {
                                icon: L.divIcon({ html: uIconHtml, className: '', iconSize: [40, 40], iconAnchor: [20, 20] }),
                                zIndexOffset: 1000
                            }).addTo(ml);
                        }

                        drawNearestStations(globalUserLatLng);
                        loader.style.display = 'none';

                    }, function(err) {
                        loader.style.display = 'none';
                        alert("Error de GPS. Verifica los permisos de tu navegador.");
                        isTracking = false;
                        btnText.innerText = "Radar GPS"; gpsPanel.style.display = 'none'; tableContainer.style.display = 'none';
                    }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 });
                }
            });
        }
