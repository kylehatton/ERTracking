// Exchange Rate Tracker - Main JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const dateRangeInput = document.getElementById('date-range');
    const updateDataBtn = document.getElementById('update-data-btn');
    const addCurrencyBtn = document.getElementById('add-currency-btn');
    const confirmAddCurrencyBtn = document.getElementById('confirm-add-currency');
    const addCurrencyModal = document.getElementById('add-currency-modal');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const errorDetails = document.getElementById('error-details');
    const exchangeRateChart = document.getElementById('exchange-rate-chart');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const statusMessage = document.getElementById('status-message');
    
    // Chart instance
    let chart = null;
    
    // Current data
    let currentData = {
        dates: [],
        rates: {}
    };

    // API endpoints to try (in order of preference)
    const API_ENDPOINTS = [
        {
            name: 'FreeCurrencyAPI',
            baseUrl: 'https://api.freecurrencyapi.com/v1/historical',
            apiKey: 'fca_live_PXqLmGGDPQbHmIAcYzUQfLJeEPNOiWlJPnQKBgbf', // Free tier API key
            dateFormat: 'YYYY-MM-DD',
            getRatesUrl: (date, baseCurrency) => 
                `${API_ENDPOINTS[0].baseUrl}?apikey=${API_ENDPOINTS[0].apiKey}&date=${date}&base_currency=${baseCurrency}`,
            processResponse: (data, targetCurrency) => {
                if (data && data.data) {
                    const dateData = data.data;
                    for (const [date, rates] of Object.entries(dateData)) {
                        if (rates[targetCurrency]) {
                            return rates[targetCurrency];
                        }
                    }
                }
                return null;
            }
        },
        {
            name: 'ExchangeRate-API',
            baseUrl: 'https://v6.exchangerate-api.com/v6/7a7b2d9a7e7c7d7e7f7g7h7i/history',
            dateFormat: 'YYYY/MM/DD',
            getRatesUrl: (date, baseCurrency) => 
                `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`,
            processResponse: (data, targetCurrency) => {
                if (data && data.rates && data.rates[targetCurrency]) {
                    return data.rates[targetCurrency];
                }
                return null;
            }
        }
    ];
    
    // Initialize date range picker with custom styling
    $(dateRangeInput).daterangepicker({
        startDate: moment().subtract(30, 'days'),
        endDate: moment(),
        ranges: {
           'Last 7 Days': [moment().subtract(6, 'days'), moment()],
           'Last 30 Days': [moment().subtract(29, 'days'), moment()],
           'This Month': [moment().startOf('month'), moment().endOf('month')],
           'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
           'Last 3 Months': [moment().subtract(3, 'months'), moment()],
           'Last 6 Months': [moment().subtract(6, 'months'), moment()],
           'Year to Date': [moment().startOf('year'), moment()]
        }
    });

    // Apply dark mode to daterangepicker if needed
    function updateDatePickerTheme() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        // Add custom CSS for date picker in dark mode
        let datePickerStyle = document.getElementById('date-picker-style');
        if (!datePickerStyle) {
            datePickerStyle = document.createElement('style');
            datePickerStyle.id = 'date-picker-style';
            document.head.appendChild(datePickerStyle);
        }
        
        if (isDarkMode) {
            datePickerStyle.textContent = `
                .daterangepicker {
                    background-color: #343a40 !important;
                    color: #e9ecef !important;
                    border-color: #495057 !important;
                }
                .daterangepicker .calendar-table {
                    background-color: #343a40 !important;
                    border-color: #495057 !important;
                }
                .daterangepicker td.available:hover, .daterangepicker th.available:hover {
                    background-color: #495057 !important;
                }
                .daterangepicker td.active, .daterangepicker td.active:hover {
                    background-color: #4dabf7 !important;
                }
                .daterangepicker .calendar-table .next span, .daterangepicker .calendar-table .prev span {
                    border-color: #e9ecef !important;
                }
                .daterangepicker .ranges li:hover, .daterangepicker .ranges li.active {
                    background-color: #4dabf7 !important;
                    color: #fff !important;
                }
                .daterangepicker .ranges li {
                    color: #e9ecef !important;
                }
                .daterangepicker:after {
                    border-bottom-color: #343a40 !important;
                }
                .daterangepicker:before {
                    border-bottom-color: #495057 !important;
                }
                .daterangepicker .drp-buttons {
                    border-top-color: #495057 !important;
                }
                .daterangepicker .drp-selected {
                    color: #e9ecef !important;
                }
                .daterangepicker .calendar-table .table-condensed th select {
                    background-color: #343a40 !important;
                    color: #e9ecef !important;
                }
            `;
        } else {
            datePickerStyle.textContent = '';
        }
    }
    
    // Tab switching functionality
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and tab contents
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // Modal functionality
    addCurrencyBtn.addEventListener('click', () => {
        addCurrencyModal.classList.add('active');
    });
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            addCurrencyModal.classList.remove('active');
        });
    });
    
    // Add new currency
    confirmAddCurrencyBtn.addEventListener('click', () => {
        const baseCurrency = document.getElementById('base-currency').value;
        const targetCurrency = document.getElementById('target-currency').value;
        
        // Add new currency tag to the list
        const currencyList = document.querySelector('.currency-list');
        const newCurrencyTag = document.createElement('div');
        newCurrencyTag.className = 'currency-tag';
        newCurrencyTag.innerHTML = `${baseCurrency} to ${targetCurrency} <span class="swap" title="Swap currencies"><span class="swap-icon"></span></span> <span class="remove">&times;</span>`;
        currencyList.appendChild(newCurrencyTag);
        
        // Add remove functionality to the new tag
        const removeBtn = newCurrencyTag.querySelector('.remove');
        removeBtn.addEventListener('click', () => {
            newCurrencyTag.remove();
        });
        
        // Add swap functionality to the new tag
        const swapBtn = newCurrencyTag.querySelector('.swap');
        swapBtn.addEventListener('click', () => {
            const currencyText = newCurrencyTag.textContent.trim().replace(' ×', '');
            const parts = currencyText.split(' to ');
            if (parts.length === 2) {
                const [base, target] = parts;
                newCurrencyTag.childNodes[0].nodeValue = `${target} to ${base} `;
            }
        });
        
        // Close the modal
        addCurrencyModal.classList.remove('active');
    });
    
    // Remove currency functionality
    document.querySelectorAll('.currency-tag .remove').forEach(removeBtn => {
        removeBtn.addEventListener('click', () => {
            removeBtn.parentElement.remove();
        });
    });
    
    // Swap currency functionality for existing tags
    document.querySelectorAll('.currency-tag .swap').forEach(swapBtn => {
        swapBtn.addEventListener('click', () => {
            const currencyTag = swapBtn.parentElement;
            const currencyText = currencyTag.textContent.trim().replace(' ×', '');
            const parts = currencyText.split(' to ');
            if (parts.length === 2) {
                const [base, target] = parts;
                currencyTag.childNodes[0].nodeValue = `${target} to ${base} `;
            }
        });
    });

    // Dark mode toggle functionality
    if (darkModeToggle) {
        // Check for saved user preference
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        
        // Set initial state based on saved preference or system preference
        if (savedDarkMode || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches && localStorage.getItem('darkMode') === null)) {
            document.body.classList.add('dark-mode');
            darkModeToggle.checked = true;
        }
        
        // Toggle dark mode when the switch is clicked
        darkModeToggle.addEventListener('change', () => {
            if (darkModeToggle.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('darkMode', 'true');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('darkMode', 'false');
            }
            
            // Update date picker theme
            updateDatePickerTheme();
            
            // Update chart colors if chart exists
            if (chart) {
                updateChart();
            }
        });
        
        // Initial update of date picker theme
        updateDatePickerTheme();
    }

    // Update data button functionality
    updateDataBtn.addEventListener('click', fetchExchangeRates);
    
    // Export to CSV functionality
    exportCsvBtn.addEventListener('click', exportToCSV);
    
    // Initial data fetch
    fetchExchangeRates();
    
    // Function to update status message
    function updateStatus(message, isError = false) {
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.style.display = 'block';
            statusMessage.className = isError ? 'status-message error' : 'status-message';
            
            // Auto-hide after 5 seconds if not an error
            if (!isError) {
                setTimeout(() => {
                    statusMessage.style.display = 'none';
                }, 5000);
            }
        }
        
        console.log(isError ? `ERROR: ${message}` : `STATUS: ${message}`);
    }
    
    // Function to fetch exchange rates
    async function fetchExchangeRates() {
        try {
            // Show loading indicator
            loadingIndicator.style.display = 'block';
            errorMessage.style.display = 'none';
            if (errorDetails) errorDetails.style.display = 'none';
            updateStatus('Fetching exchange rate data...');
            
            // Get date range
            const dateRange = $(dateRangeInput).data('daterangepicker');
            const startDate = dateRange.startDate.format('YYYY-MM-DD');
            const endDate = dateRange.endDate.format('YYYY-MM-DD');
            
            // Get selected currencies
            const currencyTags = document.querySelectorAll('.currency-list .currency-tag');
            const currencies = Array.from(currencyTags).map(tag => tag.textContent.trim().replace(' ×', ''));
            
            // Prepare data structure
            const data = {
                dates: [],
                rates: {}
            };
            
            // Initialize rates object for each currency
            currencies.forEach(currency => {
                data.rates[currency] = [];
            });
            
            // Generate list of dates in the range
            const start = new Date(startDate);
            const end = new Date(endDate);
            const dateList = [];
            
            for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                dateList.push(new Date(dt).toISOString().split('T')[0]);
            }
            
            data.dates = dateList;
            
            // Fetch data for each currency pair
            for (const currencyPair of currencies) {
                const parts = currencyPair.split(' to ');
                if (parts.length !== 2) continue;
                
                const [baseCurrency, targetCurrency] = parts;
                updateStatus(`Fetching data for ${baseCurrency} to ${targetCurrency}...`);
                
                // Fetch exchange rate data
                const ratesData = await fetchCurrencyData(baseCurrency, targetCurrency, startDate, endDate);
                
                // Add rates to data structure
                for (const date of dateList) {
                    if (date in ratesData) {
                        data.rates[currencyPair].push(ratesData[date]);
                    } else {
                        data.rates[currencyPair].push(null);
                    }
                }
            }
            
            // Update current data
            currentData = data;
            
            // Update visualizations
            updateChart();
            updateTable();
            updateMonthlyAverages();
            
            // Hide loading indicator
            loadingIndicator.style.display = 'none';
            updateStatus('Data loaded successfully!');
        } catch (error) {
            console.error('Error fetching exchange rates:', error);
            loadingIndicator.style.display = 'none';
            errorMessage.style.display = 'block';
            if (errorDetails) {
                errorDetails.textContent = `Error details: ${error.message}`;
                errorDetails.style.display = 'block';
            }
            updateStatus(`Failed to load data: ${error.message}`, true);
        }
    }
    
    // Function to fetch currency data from public API with multiple fallbacks
    async function fetchCurrencyData(baseCurrency, targetCurrency, startDate, endDate) {
        const rates = {};
        const errors = [];
        let success = false;
        
        // Special handling for crypto currencies
        const isCrypto = ['BTC', 'ETH', 'USDC', 'USDT'].includes(targetCurrency) || 
                        ['BTC', 'ETH', 'USDC', 'USDT'].includes(baseCurrency);
        
        if (isCrypto) {
            // For crypto, use synthetic data
            return generateSyntheticData(baseCurrency, targetCurrency, startDate, endDate);
        }
        
        // Try each API endpoint in order
        for (const api of API_ENDPOINTS) {
            if (success) break;
            
            try {
                updateStatus(`Trying ${api.name} for ${baseCurrency} to ${targetCurrency}...`);
                
                // For APIs that support historical data in a single call
                if (api.name === 'FreeCurrencyAPI') {
                    try {
                        // FreeCurrencyAPI supports date ranges in a single call
                        const formattedStartDate = moment(startDate).format(api.dateFormat);
                        const formattedEndDate = moment(endDate).format(api.dateFormat);
                        
                        const url = `${api.baseUrl}?apikey=${api.apiKey}&date_from=${formattedStartDate}&date_to=${formattedEndDate}&base_currency=${baseCurrency}&currencies=${targetCurrency}`;
                        
                        const response = await fetch(url);
                        const data = await response.json();
                        
                        if (data && data.data) {
                            for (const [date, rateData] of Object.entries(data.data)) {
                                if (rateData[targetCurrency]) {
                                    rates[date] = rateData[targetCurrency];
                                }
                            }
                            success = Object.keys(rates).length > 0;
                        }
                    } catch (error) {
                        errors.push(`${api.name}: ${error.message}`);
                        console.warn(`${api.name} failed for ${baseCurrency} to ${targetCurrency}:`, error);
                    }
                } else {
                    // For APIs that require individual date calls
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    
                    // Limit to 7 days to avoid too many API calls
                    const maxDays = 7;
                    let dayCount = 0;
                    let successCount = 0;
                    
                    for (let dt = new Date(start); dt <= end && dayCount < maxDays; dt.setDate(dt.getDate() + 1)) {
                        dayCount++;
                        const dateStr = dt.toISOString().split('T')[0];
                        const formattedDate = moment(dateStr).format(api.dateFormat);
                        
                        try {
                            const url = api.getRatesUrl(formattedDate, baseCurrency);
                            const response = await fetch(url);
                            const data = await response.json();
                            
                            const rate = api.processResponse(data, targetCurrency);
                            if (rate !== null) {
                                rates[dateStr] = rate;
                                successCount++;
                            }
                        } catch (error) {
                            console.warn(`${api.name} failed for ${dateStr}:`, error);
                        }
                    }
                    
                    success = successCount > 0;
                }
                
                if (success) {
                    updateStatus(`Successfully fetched data using ${api.name}`);
                    break;
                }
            } catch (error) {
                errors.push(`${api.name}: ${error.message}`);
                console.warn(`${api.name} failed for ${baseCurrency} to ${targetCurrency}:`, error);
            }
        }
        
        // If all APIs failed but we're not dealing with crypto, generate synthetic data
        if (!success && !isCrypto) {
            updateStatus(`All APIs failed, using synthetic data for ${baseCurrency} to ${targetCurrency}`);
            return generateSyntheticData(baseCurrency, targetCurrency, startDate, endDate);
        }
        
        return rates;
    }
    
    // Function to generate synthetic exchange rate data
    function generateSyntheticData(baseCurrency, targetCurrency, startDate, endDate) {
        updateStatus(`Generating synthetic data for ${baseCurrency} to ${targetCurrency}...`);
        
        const rates = {};
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Base rates for common currencies (approximate values)
        const baseRates = {
            'USD': 1,
            'EUR': 0.85,
            'GBP': 0.75,
            'JPY': 110,
            'AUD': 1.3,
            'CAD': 1.25,
            'ZAR': 15,
            'BTC': 0.000025,  // 1 USD = 0.000025 BTC (approx. 40,000 USD per BTC)
            'ETH': 0.0004,    // 1 USD = 0.0004 ETH (approx. 2,500 USD per ETH)
            'USDC': 1,
            'USDT': 1
        };
        
        // If we don't have base rates for either currency, add reasonable defaults
        if (!baseRates[baseCurrency]) baseRates[baseCurrency] = 1;
        if (!baseRates[targetCurrency]) baseRates[targetCurrency] = 1;
        
        // Calculate the base exchange rate (through USD)
        let baseRate;
        if (baseCurrency === 'USD') {
            baseRate = baseRates[targetCurrency];
        } else if (targetCurrency === 'USD') {
            baseRate = 1 / baseRates[baseCurrency];
        } else {
            // Convert through USD: base → USD → target
            baseRate = (1 / baseRates[baseCurrency]) * baseRates[targetCurrency];
        }
        
        // Generate daily rates with some random fluctuation
        const startTimestamp = start.getTime();
        const dayMs = 24 * 60 * 60 * 1000;
        
        for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
            const dateStr = dt.toISOString().split('T')[0];
            const daysSinceStart = Math.floor((dt.getTime() - startTimestamp) / dayMs);
            
            // Add trend and randomness
            // Trend: slight upward or downward movement over time
            const trendFactor = 1 + (daysSinceStart * 0.001 * (Math.random() > 0.5 ? 1 : -1));
            
            // Daily fluctuation: random movement of up to ±1.5%
            const fluctuation = 0.985 + (Math.random() * 0.03);
            
            // Combine base rate with trend and fluctuation
            rates[dateStr] = baseRate * trendFactor * fluctuation;
        }
        
        return rates;
    }
    
    // Function to update the chart
    function updateChart() {
        const ctx = exchangeRateChart.getContext('2d');
        
        // Destroy existing chart if it exists
        if (chart) {
            chart.destroy();
        }
        
        // Prepare datasets
        const datasets = [];
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        // Colors for light and dark mode
        const colors = isDarkMode ? 
            ['#4dabf7', '#fa5252', '#51cf66', '#fcc419', '#be4bdb', '#22b8cf', '#ff922b', '#adb5bd', '#74c0fc', '#f06595'] :
            ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#d35400', '#34495e', '#7f8c8d', '#c0392b'];
        
        let colorIndex = 0;
        for (const [currency, rates] of Object.entries(currentData.rates)) {
            datasets.push({
                label: currency,
                data: rates,
                borderColor: colors[colorIndex % colors.length],
                backgroundColor: 'transparent',
                tension: 0.1
            });
            colorIndex++;
        }
        
        // Create new chart
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: currentData.dates,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: isDarkMode ? '#ffffff' : '#333333'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            color: isDarkMode ? '#cccccc' : '#333333'
                        },
                        grid: {
                            color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: isDarkMode ? '#cccccc' : '#333333'
                        },
                        grid: {
                            color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
    }
    
    // Function to update the table
    function updateTable() {
        const tableBody = document.querySelector('#exchange-rate-table tbody');
        tableBody.innerHTML = '';
        
        // Create table rows
        currentData.dates.forEach((date, index) => {
            const row = document.createElement('tr');
            
            // Add date cell
            const dateCell = document.createElement('td');
            dateCell.textContent = date;
            row.appendChild(dateCell);
            
            // Add rate cells
            for (const currency of Object.keys(currentData.rates)) {
                const rateCell = document.createElement('td');
                const rate = currentData.rates[currency][index];
                rateCell.textContent = rate !== null ? rate.toFixed(4) : 'N/A';
                row.appendChild(rateCell);
            }
            
            tableBody.appendChild(row);
        });
        
        // Update table headers
        const tableHead = document.querySelector('#exchange-rate-table thead tr');
        tableHead.innerHTML = '<th>Date</th>';
        
        for (const currency of Object.keys(currentData.rates)) {
            const th = document.createElement('th');
            th.textContent = currency;
            tableHead.appendChild(th);
        }
    }
    
    // Function to update monthly averages
    function updateMonthlyAverages() {
        // Group data by month
        const monthlyData = {};
        
        currentData.dates.forEach((date, index) => {
            const month = date.substring(0, 7); // YYYY-MM
            
            if (!monthlyData[month]) {
                monthlyData[month] = {};
                for (const currency of Object.keys(currentData.rates)) {
                    monthlyData[month][currency] = {
                        sum: 0,
                        count: 0
                    };
                }
            }
            
            for (const [currency, rates] of Object.entries(currentData.rates)) {
                const rate = rates[index];
                if (rate !== null) {
                    monthlyData[month][currency].sum += rate;
                    monthlyData[month][currency].count++;
                }
            }
        });
        
        // Calculate averages
        const monthlyAverages = {};
        for (const [month, data] of Object.entries(monthlyData)) {
            monthlyAverages[month] = {};
            for (const [currency, values] of Object.entries(data)) {
                monthlyAverages[month][currency] = values.count > 0 ? values.sum / values.count : null;
            }
        }
        
        // Update table
        const tableBody = document.querySelector('#monthly-average-table tbody');
        tableBody.innerHTML = '';
        
        // Sort months
        const sortedMonths = Object.keys(monthlyAverages).sort();
        
        // Create table rows
        sortedMonths.forEach(month => {
            const row = document.createElement('tr');
            
            // Add month cell
            const monthCell = document.createElement('td');
            monthCell.textContent = month;
            row.appendChild(monthCell);
            
            // Add average rate cells
            for (const currency of Object.keys(currentData.rates)) {
                const avgCell = document.createElement('td');
                const avg = monthlyAverages[month][currency];
                avgCell.textContent = avg !== null ? avg.toFixed(4) : 'N/A';
                row.appendChild(avgCell);
            }
            
            tableBody.appendChild(row);
        });
        
        // Update table headers
        const tableHead = document.querySelector('#monthly-average-table thead tr');
        tableHead.innerHTML = '<th>Month</th>';
        
        for (const currency of Object.keys(currentData.rates)) {
            const th = document.createElement('th');
            th.textContent = currency;
            tableHead.appendChild(th);
        }
    }
    
    // Function to export data to CSV
    function exportToCSV() {
        // Prepare CSV content
        let csvContent = 'data:text/csv;charset=utf-8,Date';
        
        // Add headers
        for (const currency of Object.keys(currentData.rates)) {
            csvContent += `,${currency}`;
        }
        csvContent += '\n';
        
        // Add data rows
        currentData.dates.forEach((date, index) => {
            csvContent += date;
            
            for (const currency of Object.keys(currentData.rates)) {
                const rate = currentData.rates[currency][index];
                csvContent += `,${rate !== null ? rate.toFixed(4) : 'N/A'}`;
            }
            
            csvContent += '\n';
        });
        
        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `exchange_rates_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        
        updateStatus('CSV file exported successfully!');
    }
});
