const express = require('express');
const axios = require('axios');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const app = express();
const port = 3000;

const width = 800;
const height = 600;

const chartConfigurationFactory = (responseTimes) => {
  return {
    type: 'bar',
    data: {
      labels: ['karachan.org', 'wilchan.org'],
      datasets: [
        {
          label: 'Czas odpowiedzi serwera (ms)',
          data: responseTimes,
          backgroundColor: ['rgba(75, 192, 192, 0.2)', 'rgba(255, 99, 132, 0.2)'],
          borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  };
};

// Ustaw silnik szablonów na EJS
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/chart', async (req, res) => {
  const websites = ['https://karachan.org', 'https://wilchan.org'];
  const responseTimes = [];

  for (const site of websites) {
    try {
      const startTime = new Date();
      await axios.get(site);
      const endTime = new Date();
      const responseTime = endTime - startTime;
      responseTimes.push(responseTime);
    } catch (error) {
      responseTimes.push(null);
    }
  }

  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });
  const chartConfiguration = chartConfigurationFactory(responseTimes);

  const image = await chartJSNodeCanvas.renderToBuffer(chartConfiguration);
  res.type('image/png');
  res.send(image);
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
