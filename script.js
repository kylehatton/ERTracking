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
    const exchangeRateChart = document.getElementById('exchange-rate-chart');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    
    // Chart instance
    let chart = null;
    
    // Current data
    let currentData = {
        dates: [],
        rates: {}
    };
    
    // Initialize date range picker
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

    // Update data button functionality
    updateDataBtn.addEventListener('click', fetchExchangeRates);
    
    // Export to CSV functionality
    exportCsvBtn.addEventListener('click', exportToCSV);
    
    // Initial data fetch
    fetchExchangeRates();
    
    // Function to fetch exchange rates
    async function fetchExchangeRates() {
        try {
            // Show loading indicator
            loadingIndicator.style.display = 'block';
            errorMessage.style.display = 'none';
            
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
        } catch (error) {
            console.error('Error fetching exchange rates:', error);
            loadingIndicator.style.display = 'none';
            errorMessage.style.display = 'block';
        }
    }
    
    // Function to fetch currency data from public API
    async function fetchCurrencyData(baseCurrency, targetCurrency, startDate, endDate) {
        // Use ExchangeRate.host API which has CORS support and historical data
        const apiUrl = `https://api.exchangerate.host/timeseries?start_date=${startDate}&end_date=${endDate}&base=${baseCurrency}&symbols=${targetCurrency}`;
        
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error('API request failed');
            }
            
            const rates = {};
            
            // Process the response
            for (const [date, rateData] of Object.entries(data.rates)) {
                if (targetCurrency in rateData) {
                    rates[date] = rateData[targetCurrency];
                }
            }
            
            // Special handling for crypto currencies not supported by the API
            if (['BTC', 'ETH', 'USDC', 'USDT'].includes(targetCurrency)) {
                // For crypto, we'll use a combination of USD rates and crypto/USD rates
                // This is a simplified approach - in a real app, you'd use a crypto-specific API
                
                // For demo purposes, generate synthetic data for crypto
                const baseRate = targetCurrency === 'BTC' ? 40000 : 
                                targetCurrency === 'ETH' ? 2500 : 1;
                                
                const startTimestamp = new Date(startDate).getTime();
                const dayMs = 24 * 60 * 60 * 1000;
                
                for (const date of Object.keys(rates)) {
                    const daysSinceStart = Math.floor((new Date(date).getTime() - startTimestamp) / dayMs);
                    
                    // Add some randomness to simulate price fluctuations
                    const randomFactor = 0.98 + (Math.random() * 0.04); // ±2%
                    
                    if (targetCurrency === 'BTC' || targetCurrency === 'ETH') {
                        // For crypto to fiat: multiply by base rate and add some randomness
                        rates[date] = rates[date] * baseRate * randomFactor;
                    } else {
                        // For stablecoins: roughly 1:1 with USD with tiny fluctuations
                        rates[date] = rates[date] * randomFactor;
                    }
                }
            }
            
            return rates;
        } catch (error) {
            console.error(`Error fetching data for ${baseCurrency} to ${targetCurrency}:`, error);
            return {};
        }
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
        const colors = [
            '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', 
            '#1abc9c', '#d35400', '#34495e', '#7f8c8d', '#c0392b'
        ];
        
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
                            minRotation: 45
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
    }
});
