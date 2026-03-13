document.addEventListener('DOMContentLoaded', () => {
    
    // --- AUTHENTICATION MODULE ---
    const loginForm = document.getElementById('login-form');
    const loginScreen = document.getElementById('login-screen');
    const dashboardContent = document.getElementById('dashboard-content');
    const loginError = document.getElementById('login-error');
    const btnLogout = document.getElementById('btn-logout');

    const toggleAuth = (isAuthenticated) => {
        if (isAuthenticated) {
            loginScreen.classList.add('hidden-auth');
            dashboardContent.classList.remove('hidden-auth');
            loadDashboardData();
        } else {
            loginScreen.classList.remove('hidden-auth');
            dashboardContent.classList.add('hidden-auth');
            document.getElementById('password').value = '';
        }
    };

    // Check session
    if (sessionStorage.getItem('logistica_auth') === 'true') {
        toggleAuth(true);
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value.trim();
        
        if (user === 'user' && pass === '123') {
            sessionStorage.setItem('logistica_auth', 'true');
            loginError.classList.add('hidden');
            toggleAuth(true);
        } else {
            loginError.classList.remove('hidden');
        }
    });

    btnLogout.addEventListener('click', () => {
        sessionStorage.removeItem('logistica_auth');
        toggleAuth(false);
    });

    // --- DASHBOARD RENDER MODULE ---
    async function loadDashboardData() {
        try {
            // Because of CORS locally, if run natively it might fail without a server. 
            // In GitHub Pages it will work perfectly. 
            // Fetch fallback pattern implemented:
            const response = await fetch('data.json');
            if (!response.ok) throw new Error("Fallo al obtener JSON");
            
            const data = await response.json();
            renderUI(data);
        } catch (error) {
            console.error("Error loading data:", error);
            document.getElementById('fecha-corte-text').innerHTML = `<span class="text-red-400">Error de conexión a datos locales. Use Live Server.</span>`;
        }
    }

    function renderUI(data) {
        // 1. Meta
        document.getElementById('fecha-corte-text').innerText = `Corte Operativo: ${data.metadata.fecha_corte}`;

        // 2. KPIs
        let totalMeds = 0; let valMeds = 0;
        let totalIns = 0; let valIns = 0;
        
        data.resumen_general.forEach(r => {
            if(r.tipo.toUpperCase() === 'MEDICAMENTO') { totalMeds += (r.items || 0); valMeds += r.stock_total || 0; }
            if(r.tipo.toUpperCase() === 'INSUMO') { totalIns += (r.items || 0); valIns += r.stock_total || 0; }
        });

        const medsCriticos = data.alertas_criticas.medicamentos ? data.alertas_criticas.medicamentos.length : 0;
        const ins_criticos = data.alertas_criticas.insumos ? data.alertas_criticas.insumos.length : 0;

        const kpiMeds = document.getElementById('kpi-meds');
        if(kpiMeds) kpiMeds.innerText = totalMeds;
        
        const kpiIns = document.getElementById('kpi-insumos');
        if(kpiIns) kpiIns.innerText = totalIns;
        
        const kpiMedsCrit = document.getElementById('kpi-meds-crit');
        if(kpiMedsCrit) kpiMedsCrit.innerText = medsCriticos;
        
        const kpiInsCrit = document.getElementById('kpi-insumos-crit');
        if(kpiInsCrit) kpiInsCrit.innerText = ins_criticos;

        // Dynamic Titles for Critical Tables
        const medsTitle = document.getElementById('meds-title');
        if(medsTitle && data.alertas_criticas.medicamentos) {
            medsTitle.innerHTML = `<span class="pulse-critical w-2 h-2 rounded-full bg-red-500"></span>${data.alertas_criticas.medicamentos.length} Medicamentos Críticos`;
        }
        const insTitle = document.getElementById('ins-title');
        if(insTitle && data.alertas_criticas.insumos) {
            insTitle.innerHTML = `<span class="w-2 h-2 rounded-full bg-orange-500"></span>${data.alertas_criticas.insumos.length} Insumos Críticos`;
        }

        // 3. Populate Critical Tables
        const renderRow = (item, type) => {
            const cobClass = item.cobertura < 2 ? 'text-red-400 font-bold' : 'text-orange-300';
            const prodName = item.producto ? String(item.producto) : 'Ítem sin descripción';
            return `
            <tr class="hover:bg-slate-700/30 transition-colors">
                <td class="px-4 py-3 font-mono text-xs text-slate-400">${item.codigo}</td>
                <td class="px-4 py-3 font-medium text-slate-200">
                    <div class="truncate max-w-[200px] lg:max-w-xs" title="${prodName}">
                        ${prodName.substring(0,40)}${prodName.length > 40 ? '...' : ''}
                    </div>
                </td>
                <td class="px-4 py-3 text-right ${cobClass}">${item.cobertura !== null ? Number(item.cobertura).toFixed(1) : 'N/A'} d</td>
            </tr>`;
        };

        document.getElementById('table-meds-criticos').innerHTML = (data.alertas_criticas.medicamentos||[]).map(m => renderRow(m, 'M')).join('');
        document.getElementById('table-ins-criticos').innerHTML = (data.alertas_criticas.insumos||[]).map(i => renderRow(i, 'I')).join('');

        // 4. Main Chart
        const ctx = document.getElementById('mainTrendChart').getContext('2d');
        
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Inter', sans-serif";

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.tendencia_general.fechas,
                datasets: [
                    {
                        label: 'Total Recetado',
                        data: data.tendencia_general.recetado,
                        borderColor: '#60a5fa', // blue-400
                        backgroundColor: 'rgba(96, 165, 250, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#1e293b',
                        pointBorderColor: '#60a5fa',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Total Dispensado',
                        data: data.tendencia_general.dispensado,
                        borderColor: '#f43f5e', // rose-500
                        borderWidth: 3,
                        tension: 0.4,
                        pointBackgroundColor: '#1e293b',
                        pointBorderColor: '#f43f5e',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { usePointStyle: true, padding: 20 }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#cbd5e1',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        boxPadding: 4
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                        ticks: { maxTicksLimit: 12 }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false }
                    }
                }
            }
        });
        
        // 5. Build small Quick Metrics dynamically
        if (data.tendencia_general.dispensado.length >= 4) {
            let avgDisp = data.tendencia_general.dispensado.slice(-4).reduce((a,b)=>a+b,0) / 4;
            let avgRec = data.tendencia_general.recetado.slice(-4).reduce((a,b)=>a+b,0) / 4;
            let satisfaccion = avgRec > 0 ? Math.round((avgDisp/avgRec)*100) : 0;
            
            const qSat = document.getElementById('q-satisfaccion');
            if(qSat) {
                qSat.innerText = `${satisfaccion}%`;
                qSat.className = `text-xl font-bold ${satisfaccion < 80 ? 'text-orange-400' : 'text-emerald-400'}`;
            }
            const qDisp = document.getElementById('q-dispensado');
            if(qDisp) qDisp.innerText = `${Math.round(avgDisp).toLocaleString()} u`;
        }

        // 6. Inventario Completo Datatable Logic
        const invTable = document.getElementById('table-inventario-completo');
        const searchInput = document.getElementById('str-search');
        let fullInventory = data.inventario_completo || [];
        window.invSortCol = 'producto';
        window.invSortAsc = true;

        const renderInventory = (filteredData) => {
            if(!invTable) return;
            invTable.innerHTML = filteredData.map(item => {
                const prod = item.producto ? String(item.producto) : 'N/A';
                const statusColor = item.estado === 'Sin existencia' ? 'text-red-400' : 
                                    (item.estado === 'Bajo Nivel' ? 'text-orange-400' : 
                                    (item.estado === 'Sobre-stock' ? 'text-blue-400' : 'text-emerald-400'));
                return `
                <tr class="hover:bg-slate-700/30 transition-colors border-b border-slate-700/30 font-medium">
                    <td class="px-4 py-3 font-mono text-xs text-slate-400">${item.codigo}</td>
                    <td class="px-4 py-3 text-slate-200">${prod}</td>
                    <td class="px-4 py-3 text-slate-400 text-xs">${item.tipo || ''}</td>
                    <td class="px-4 py-3 ${statusColor} text-xs uppercase tracking-wider">${item.estado || ''}</td>
                    <td class="px-4 py-3 text-right text-slate-200">${item.stock || 0}</td>
                    <td class="px-4 py-3 text-right text-slate-400">${item.cobertura !== null ? Number(item.cobertura).toFixed(1) + ' d' : 'N/A'}</td>
                    <td class="px-4 py-3 text-right text-blue-400">${item.sugerido > 0 ? '+'+Math.round(item.sugerido) : 0}</td>
                </tr>`;
            }).join('');
            document.getElementById('pagination-info').innerText = `Mostrando ${filteredData.length} registros`;
        };

        const applyFiltersAndSort = () => {
            let term = searchInput ? searchInput.value.toLowerCase() : '';
            let filtered = fullInventory.filter(i => {
                const name = i.producto ? String(i.producto).toLowerCase() : '';
                const code = i.codigo ? String(i.codigo).toLowerCase() : '';
                return name.includes(term) || code.includes(term);
            });

            filtered.sort((a,b) => {
                let valA = a[window.invSortCol] ?? '';
                let valB = b[window.invSortCol] ?? '';
                if(typeof valA === 'string') valA = valA.toLowerCase();
                if(typeof valB === 'string') valB = valB.toLowerCase();
                if(valA < valB) return window.invSortAsc ? -1 : 1;
                if(valA > valB) return window.invSortAsc ? 1 : -1;
                return 0;
            });
            renderInventory(filtered);
        };

        window.sortInv = (col) => {
            if(window.invSortCol === col) window.invSortAsc = !window.invSortAsc;
            else { window.invSortCol = col; window.invSortAsc = true; }
            applyFiltersAndSort();
        };

        if(searchInput) searchInput.addEventListener('input', applyFiltersAndSort);
        applyFiltersAndSort(); // Init rendering

        // 7. Tabs Switching Logic
        const tabLinks = document.querySelectorAll('.tab-link');
        tabLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('data-target');
                if(!targetId) return;
                
                // Highlight active link visually (optional logic, kept simple)
                tabLinks.forEach(l => {
                    l.classList.remove('bg-blue-500/10', 'text-blue-400');
                    l.classList.add('hover:bg-slate-800/50', 'text-slate-300');
                });
                link.classList.add('bg-blue-500/10', 'text-blue-400');
                link.classList.remove('hover:bg-slate-800/50', 'text-slate-300');

                // Toggle views
                document.getElementById('dashboard-main').classList.add('hidden');
                document.getElementById('dashboard-inventario').classList.add('hidden');
                document.getElementById(targetId).classList.remove('hidden');
            });
        });

    }

});
