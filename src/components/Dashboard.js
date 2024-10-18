import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import axios from 'axios';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  MenuItem,
  FormControl,
  Box,
  TextField
} from '@mui/material';

// Importar y registrar componentes necesarios de Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,   // Registrar escala lineal
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,    // Registrar escala lineal
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);


// Opciones para los gráficos de líneas (con leyenda)
const lineOptions = {
  scales: {
    y: {
      beginAtZero: true,
    },
  },
  plugins: {
    legend: {
      display: true,  // Muestra la leyenda en gráficos de línea
    },
    zoom: {
      pan: {
        enabled: true,
        mode: 'x',
      },
      
      zoom: {
        wheel: {
          enabled: true,
        },
        pinch: {
          enabled: true,
        },
        mode: 'x',
      },
    },
  },
};

// Opciones para los gráficos de barras (ocultar la leyenda y centrar el título)
const barOptions = {
  scales: {
    y: {
      beginAtZero: true,
    },
  },
  plugins: {
    legend: {
      display: false,  // Oculta la leyenda en gráficos de barras
    },
    title: {
      display: true,
      text: 'Promedio de Latencia de la última Hora',  // Texto del título
      align: 'center',  // Centrar el título
      font: {
        size: 18  // Tamaño de la fuente del título
      },
      padding: {
        top: 10,
        bottom: 30
      }
    },
    zoom: {
      pan: {
        enabled: true,
        mode: 'x',
      },
      zoom: {
        wheel: {
          enabled: true,
        },
        pinch: {
          enabled: true,
        },
        mode: 'x',
      },
    },
  },
};

// Generar una lista de colores para los servidores dinámicamente
const generateColorsForServers = (servidores) => {
  return servidores.map((_, index) => `hsl(${index * 60}, 70%, 50%)`);
};

const Dashboard = () => {
  const [parametro, setParametro] = useState('descarga');
  const [datosEnVivo, setDatosEnVivo] = useState([]);
  const [datosHistoricos, setDatosHistoricos] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [promediosUltimaHora, setPromediosUltimaHora] = useState([]);
  const [servidores, setServidores] = useState([]);  // Almacenar los nombres de los servidores
  const [coloresServidores, setColoresServidores] = useState([]);  // Colores dinámicos para los servidores

  const mergeNewData = (oldData, newData) => {
    const existingTimestamps = oldData.map(dato => dato.timestamp);
    const mergedData = [...oldData, ...newData.filter(dato => !existingTimestamps.includes(dato.timestamp))];
    return mergedData;
  };

  const redondearTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '');
  };

  useEffect(() => {
    const fetchMedicionesEnVivo = async () => {
      try {
        const response = await axios.get('http://192.168.1.44:5000/realizar-medicion');
        setDatosEnVivo(prevDatos => mergeNewData(prevDatos, response.data));

        // Extraer nombres de servidores y generar colores si no se han establecido
        const servidoresUnicos = [...new Set(response.data.map(dato => dato.servidor))];
        if (servidoresUnicos.length !== servidores.length) {
          setServidores(servidoresUnicos);
          setColoresServidores(generateColorsForServers(servidoresUnicos));
        }

      } catch (error) {
        console.error('Error al obtener mediciones en vivo:', error);
      }
    };

    const interval = setInterval(fetchMedicionesEnVivo, 60000);
    return () => clearInterval(interval);
  }, [servidores]);  // Dependencia en los servidores para actualizar colores dinámicos

  const fetchMedicionesHistoricas = async (fecha) => {
    try {
      const response = await axios.get(`http://192.168.1.44:5000/mediciones-dia/${fecha}`);
      setDatosHistoricos(response.data);
    } catch (error) {
      console.error('Error al obtener mediciones históricas:', error);
    }
  };

  const fetchPromediosUltimaHora = async () => {
    try {
      const response = await axios.get('http://192.168.1.44:5000/promedio-ultima-hora');
      setPromediosUltimaHora(response.data);

      // Actualizar servidores y colores si hay cambios
      const servidoresUnicos = [...new Set(response.data.map(p => p.servidor))];
      if (servidoresUnicos.length !== servidores.length) {
        setServidores(servidoresUnicos);
        setColoresServidores(generateColorsForServers(servidoresUnicos));
      }

    } catch (error) {
      console.error('Error al obtener promedios de la última hora:', error);
    }
  };

  useEffect(() => {
    fetchPromediosUltimaHora();
    const interval = setInterval(fetchPromediosUltimaHora, 60000);
    return () => clearInterval(interval);
  }, [servidores]);

  const handleFechaChange = (e) => {
    const fecha = e.target.value;
    setFechaSeleccionada(fecha);
    fetchMedicionesHistoricas(fecha);
  };

  const datosMostrar = fechaSeleccionada ? datosHistoricos : datosEnVivo;

  const dataEnVivo = {
    labels: [...new Set(datosMostrar.map(dato => redondearTimestamp(dato.timestamp)))],
    datasets: servidores.map((servidor, index) => ({
      label: servidor,
      data: datosMostrar.filter(dato => dato.servidor === servidor).map(dato => ({
        x: redondearTimestamp(dato.timestamp),
        y: dato[parametro]
      })),
      fill: false,
      borderColor: coloresServidores[index],
      tension: 0.1,
    })),
  };

  // Aplicar los colores generados a cada gráfico de barras
  const dataLatencia = {
    labels: promediosUltimaHora.map(p => p.servidor),
    datasets: [
      {
        label: 'Latencia Promedio (ms)',
        data: promediosUltimaHora.map(p => p.latencia_promedio),
        backgroundColor: promediosUltimaHora.map((p, index) => coloresServidores[index]),
        borderColor: promediosUltimaHora.map((p, index) => coloresServidores[index]),
        borderWidth: 1,
      }
    ],
  };

  const dataJitter = {
    labels: promediosUltimaHora.map(p => p.servidor),
    datasets: [
      {
        label: 'Jitter Promedio (ms)',
        data: promediosUltimaHora.map(p => p.jitter_promedio),
        backgroundColor: promediosUltimaHora.map((p, index) => coloresServidores[index]),
        borderColor: promediosUltimaHora.map((p, index) => coloresServidores[index]),
        borderWidth: 1,
      }
    ],
  };

  const dataDescarga = {
    labels: promediosUltimaHora.map(p => p.servidor),
    datasets: [
      {
        label: 'Descarga Promedio (Mbps)',
        data: promediosUltimaHora.map(p => p.descarga_promedio),
        backgroundColor: promediosUltimaHora.map((p, index) => coloresServidores[index]),
        borderColor: promediosUltimaHora.map((p, index) => coloresServidores[index]),
        borderWidth: 1,
      }
    ],
  };

  const dataSubida = {
    labels: promediosUltimaHora.map(p => p.servidor),
    datasets: [
      {
        label: 'Subida Promedio (Mbps)',
        data: promediosUltimaHora.map(p => p.subida_promedio),
        backgroundColor: promediosUltimaHora.map((p, index) => coloresServidores[index]),
        borderColor: promediosUltimaHora.map((p, index) => coloresServidores[index]),
        borderWidth: 1,
      }
    ],
  };

  const dataPerdida = {
    labels: promediosUltimaHora.map(p => p.servidor),
    datasets: [
      {
        label: 'Pérdida Promedio (%)',
        data: promediosUltimaHora.map(p => p.perdida_promedio),
        backgroundColor: promediosUltimaHora.map((p, index) => coloresServidores[index]),
        borderColor: promediosUltimaHora.map((p, index) => coloresServidores[index]),
        borderWidth: 1,
      }
    ],
  };

  return (
    <Container maxWidth="lg" sx={{ marginTop: '20px', backgroundColor: '#f4f4f4', padding: '20px', borderRadius: '8px' }}>
      <Typography variant="h4" gutterBottom>
        Medición de parámetros de Internet
      </Typography>

      <Box sx={{ marginBottom: '20px' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <TextField
                select
                label="Parámetro"
                value={parametro}
                onChange={(e) => setParametro(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              >
                <MenuItem value="descarga">Velocidad de bajada</MenuItem>
                <MenuItem value="subida">Velocidad de subida</MenuItem>
                <MenuItem value="latencia">Latencia</MenuItem>
                <MenuItem value="jitter">Jitter</MenuItem>
                <MenuItem value="perdida">Pérdida de paquetes</MenuItem>
              </TextField>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Fecha"
              type="date"
              value={fechaSeleccionada}
              onChange={handleFechaChange}
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
            />
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12}>
          <Card sx={{ boxShadow: 3, backgroundColor: '#ffffff', borderRadius: '8px' }}>
            <CardContent>
              <Typography variant="h6">En tiempo real</Typography>
              <Line data={dataEnVivo} options={lineOptions} />  {/* Usa lineOptions para el gráfico de líneas */}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 3, backgroundColor: '#ffffff', borderRadius: '8px' }}>
            <CardContent>
              <Bar data={dataLatencia} options={barOptions} />  {/* Usa barOptions con título centrado */}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 3, backgroundColor: '#ffffff', borderRadius: '8px' }}>
            <CardContent>
              <Bar data={dataJitter} options={barOptions} />  {/* Usa barOptions con título centrado */}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 3, backgroundColor: '#ffffff', borderRadius: '8px' }}>
            <CardContent>
              <Bar data={dataDescarga} options={barOptions} />  {/* Usa barOptions con título centrado */}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 3, backgroundColor: '#ffffff', borderRadius: '8px' }}>
            <CardContent>
              <Bar data={dataSubida} options={barOptions} />  {/* Usa barOptions con título centrado */}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 3, backgroundColor: '#ffffff', borderRadius: '8px' }}>
            <CardContent>
              <Bar data={dataPerdida} options={barOptions} />  {/* Usa barOptions con título centrado */}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;