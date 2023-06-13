const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);
const axios = require('axios');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const path = require('path');

const port = process.env.PORT || 3000;

const width = 800;
const height = 600;

const chartConfigurationFactory = (responseTimes) => {
  return {
    type: 'bar',
    data: {
      labels: websites.map(site => site.name),
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

const lastMonitoringsChartConfigurationFactory = (lastMonitorings) => {
  const avgResponseTimes = lastMonitorings.map((monitoring) =>
    monitoring.reduce(
      (acc, responseTime, index) => {
        if (responseTime !== null) {
          acc.sum[index] += responseTime;
          acc.count[index] += 1;
        }
        return acc;
      },
      {
        sum: Array(websites.length).fill(0),
        count: Array(websites.length).fill(0),
      }
    )
  ).map((monitoring) =>
    monitoring.sum.map((sum, index) => (monitoring.count[index] > 0 ? sum / monitoring.count[index] : null))
  );

};

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

io.on('connection', (socket) => {
  console.log('A user connected');
  // Wywołaj funkcję monitorującą, która emituje zdarzenia do klientów
  monitorSites(socket);

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const websites = [
  { url: 'https://karachan.org', name: 'karachan.org' },
  { url: 'https://wilchan.org', name: 'wilchan.org' },
  { url: 'https://gowno.club', name: 'gowno.club' },
  { url: 'https://shadow.wilchan.org/', name: 'shadow' },
  // Dodaj tutaj więcej stron
];

async function monitorSites(socket) {
  const lastMonitorings = [];

  setInterval(async () => {
    const responseTimes = [];

    for (const site of websites) {
      try {
        const startTime = new Date();
        await axios.get(site.url);
        const endTime = new Date();
        const responseTime = endTime - startTime;
        responseTimes.push(responseTime);
      } catch (error) {
        responseTimes.push(null);
      }
    }

    const chartConfiguration = chartConfigurationFactory(responseTimes);

    // Dodaj monitorowanie do historii i utrzymuj tylko
    // ostatnich 10 monitorowań
    lastMonitorings.push(responseTimes);
    if (lastMonitorings.length > 10) {
      lastMonitorings.shift();
    }

    const lastMonitoringsChartConfiguration = lastMonitoringsChartConfigurationFactory(lastMonitorings);
    socket.emit('chartUpdate', chartConfiguration, lastMonitoringsChartConfiguration);

  }, 5000); // Interwał sprawdzania w milisekundach
}

app.get('/', async (req, res) => {
  const websiteStatuses = [];

  for (const site of websites) {
    let status = { name: site.name, isWorking: false };

    try {
      await axios.get(site.url, { timeout: 9000 });
      status.isWorking = true;
    } catch (error) {
      status.isWorking = false;
    }

    websiteStatuses.push(status);
  }
  res.render('index', { websiteStatuses });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
