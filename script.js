let currentUser = null;
let familySize = 0;
let waterLimit = 0;
const users = {};
let usageChart = null;
let comparisonChart = null;

// Average water usage per person per day (in liters)
const averageUsage = {
    drinking: 2,
    cooking: 10,
    bathing: 70,
    cleaning: 20,
    miscellaneous:10
};

// Get the current user from the URL parameter
const urlParams = new URLSearchParams(window.location.search);
currentUser = urlParams.get('user');

// Initialize the users object with the current user
if (!users[currentUser]) {
    users[currentUser] = { familySize: 0, usage: {} };
}

// Function to set the family size
function setFamilySize() {
    if (!users[currentUser]) {
        users[currentUser] = { familySize: 0, usage: {} };
    }
    familySize = parseInt(document.getElementById('familySize').value);
    users[currentUser].familySize = familySize;
    updateFamilySizeDisplay();
    showAlert(`Family size set to ${familySize}`);
}

// Function to update the family size display
function updateFamilySizeDisplay() {
    const recommendedLimit = users[currentUser].familySize * 50; // 50 liters per person
    document.getElementById('recommendedLimit').textContent = `Recommended daily limit for your family: ${recommendedLimit} liters`;
}

// Function to track the water usage
function trackUsage() {
    const usage = {
        drinking: parseInt(document.getElementById('drinking').value) || 0,
        cooking: parseInt(document.getElementById('cooking').value) || 0,
        bathing: parseInt(document.getElementById('bathing').value) || 0,
        cleaning: parseInt(document.getElementById('cleaning').value) || 0,
        miscellaneous:parseInt(document.getElementById('miscellaneous').value) || 0
    };
    users[currentUser].usage = usage;
    analyzeUsage();
    compareUsage();
}

function analyzeUsage() {
    const usage = users[currentUser].usage;
    const total = Object.values(usage).reduce((sum, val) => sum + val, 0);
    const analysis = Object.entries(usage)
        .map(([category, amount]) => `${category}: ${amount} liters (${((amount/total)*100).toFixed(2)}%)`)
        .join('<br>');
    document.getElementById('analysis').innerHTML = `Total usage: ${total} liters<br>${analysis}`;

    const highestCategory = Object.entries(usage).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    document.getElementById('analysis').innerHTML += `<br><br>You're using the most water for: ${highestCategory}`;

    updateChart(usage);
}

function updateChart(usage) {
    const ctx = document.getElementById('usageChart').getContext('2d');
    const data = {
        labels: Object.keys(usage),
        datasets: [{
            data: Object.values(usage),
            backgroundColor: [
                'rgba(255, 99, 132, 0.8)',
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 206, 86, 0.8)',
                'rgba(75, 192, 192, 0.8)',
                'rgba(153, 102, 255, 0.8)'
            ]
        }]
    };

    if (usageChart) {
        usageChart.destroy();
    }

    usageChart = new Chart(ctx, {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Water Usage Distribution'
                }
            }
        }
    });
}

function compareUsage() {
    const usage = users[currentUser].usage;
    const familySize = users[currentUser].familySize;
    
    const userTotal = Object.values(usage).reduce((sum, val) => sum + val, 0);
    const avgTotal = Object.values(averageUsage).reduce((sum, val) => sum + val, 0) * familySize;
    
    const ctx = document.getElementById('comparisonCanvas').getContext('2d');
    const data = {
        labels: ['Your Usage', 'Average Usage'],
        datasets: [{
            label: 'Total Daily Water Usage (Liters)',
            data: [userTotal, avgTotal],
            backgroundColor: [
                'rgba(75, 192, 192, 0.8)',
                'rgba(255, 159, 64, 0.8)'
            ]
        }]
    };

    if (comparisonChart) {
        comparisonChart.destroy();
    }

    comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Your Usage vs Average Family Usage'
                }
            }
        }
    });

    let comparisonHtml = `<h3>Detailed Comparison</h3>`;
    let totalDifference = 0;
    
    for (const category in usage) {
        const userUsage = usage[category];
        const avgUsage = averageUsage[category] * familySize;
        const difference = userUsage - avgUsage;
        totalDifference += difference;
        
        comparisonHtml += `<p><strong>${category}:</strong> `;
        comparisonHtml += `Your usage: ${userUsage} liters, `;
        comparisonHtml += `Average: ${avgUsage} liters, `;
        comparisonHtml += `Difference: ${difference.toFixed(2)} liters `;
        comparisonHtml += difference > 0 ? '(above average)' : '(below average)';
        comparisonHtml += `</p>`;
    }

    const comparisonResult = document.createElement('div');
    comparisonResult.className = `comparison-result ${totalDifference > 0 ? 'above-average' : 'below-average'}`;
    comparisonResult.textContent = totalDifference > 0 
        ? `Your family uses ${totalDifference.toFixed(2)} liters more than the average family of ${familySize} people.`
        : `Your family uses ${Math.abs(totalDifference).toFixed(2)} liters less than the average family of ${familySize} people.`;

    document.getElementById('comparisonAnalysis').innerHTML = comparisonHtml;
    document.getElementById('comparisonAnalysis').appendChild(comparisonResult);
}

function setWaterLimit() {
    waterLimit = parseInt(document.getElementById('waterLimit').value);
    showAlert('Water limit set successfully!', true);
    generateUsagePlan();
}

function generateUsagePlan() {
    const usage = users[currentUser].usage;
    const total = Object.values(usage).reduce((sum, val) => sum + val, 0);
    const familySize = users[currentUser].familySize;
    const recommendedLimit = familySize * 50; // 50 liters per person

    if (waterLimit <= 0 || isNaN(waterLimit)) {
        document.getElementById('usagePlan').innerHTML = 'Please set a valid water limit.';
        return;
    }

    if (total > waterLimit) {
        // Prioritize categories
        const essentialCategories = ['drinking', 'cooking'];
        const nonEssentialCategories = ['bathing', 'cleaning'];

        // Calculate essential and non-essential usage totals
        let essentialUsage = essentialCategories.reduce((sum, category) => sum + (usage[category] || 0), 0);
        let nonEssentialUsage = nonEssentialCategories.reduce((sum, category) => sum + (usage[category] || 0), 0);

        let plan = '';
        let remainingLimit = waterLimit;

        // Handle essential categories first
        plan += '<strong>Essential Categories:</strong><br>';
        essentialCategories.forEach((category) => {
            const amount = usage[category] || 0;
            const adjustedAmount = Math.min(amount, remainingLimit * (amount / essentialUsage));
            remainingLimit -= adjustedAmount;
            plan += `${category}: ${Math.round(adjustedAmount)} liters<br>`;
        });

        // Handle non-essential categories with remaining limit
        plan += '<br><strong>Non-Essential Categories:</strong><br>';
        nonEssentialCategories.forEach((category) => {
            const amount = usage[category] || 0;
            const adjustedAmount = Math.min(amount, remainingLimit * (amount / nonEssentialUsage));
            remainingLimit -= adjustedAmount;
            plan += `${category}: ${Math.round(adjustedAmount)} liters<br>`;
        });

        document.getElementById('usagePlan').innerHTML = `To meet your ${waterLimit} liter limit, try this plan:<br>${plan}`;
    } else {
        document.getElementById('usagePlan').innerHTML = `Your current usage (${total} liters) is within the ${waterLimit} liter limit.`;
    }

    if (waterLimit < recommendedLimit) {
        document.getElementById('usagePlan').innerHTML += `<br><br><strong>Note:</strong> Your set limit (${waterLimit} liters) is below the recommended ${recommendedLimit} liters for a family of ${familySize}. Consider increasing your limit for healthier living.`;
    }
}

function showAlert(message, isSuccess = false) {
    const alertBox = document.getElementById('customAlert');
    const alertMessage = document.getElementById('alertMessage');
    
    alertMessage.textContent = message;
    if (isSuccess) {
        alertBox.classList.add('success');
    } else {
        alertBox.classList.remove('success');
    }
    alertBox.style.display = 'block';
}

function closeAlert() {
    const alertBox = document.getElementById('customAlert');
    alertBox.style.display = 'none';
}