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
  TextField,
  Button
} from '@mui/material';

// Importar y registrar componentes necesarios de Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
// Importar el plugin de zoom
import zoomPlugin from 'chartjs-plugin-zoom';
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin // Se incluye el plugin de zoom
);

// Opciones para los gráficos de líneas con zoom
const lineOptions = {
  scales: {
    y: {
      beginAtZero: true,
    },
  },
  plugins: {
    legend: {
      display: true,
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

// Función para generar las opciones de gráficos de barras, personalizando el título y manteniendo el zoom
const barOptions = (titulo) => ({
  scales: {
    y: {
      beginAtZero: true,
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: true,
      text: titulo, // Título dinámico
      align: 'center',
      font: {
        size: 18
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
});

// Generar una lista de colores para los servidores
const generateColorsForServers = (servidores) => {
  return servidores.map((_, index) => `hsl(${index * 60}, 70%, 50%)`);
};

const Dashboard = () => {
  const [parametro, setParametro] = useState('descarga');
  const [datosEnVivo, setDatosEnVivo] = useState([]);
  const [datosHistoricos, setDatosHistoricos] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [promediosUltimaHora, setPromediosUltimaHora] = useState([]);
  const [servidores, setServidores] = useState([]);
  const [coloresServidores, setColoresServidores] = useState([]);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');

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
  }, [servidores]);

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

  // Nueva función para obtener mediciones en un rango de tiempo
  const buscarMedicionesRango = async () => {
    try {
      const response = await axios.get('http://192.168.1.44:5000/mediciones-rango', {
        params: {
          fecha: fechaSeleccionada,
          horaInicio: horaInicio,
          horaFin: horaFin
        }
      });
      setDatosHistoricos(response.data);
    } catch (error) {
      console.error('Error al obtener las mediciones en rango:', error);
    }
  };

  const handleFechaChange = (e) => {
    setFechaSeleccionada(e.target.value);
    fetchMedicionesHistoricas(e.target.value);
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

  // Gráficos de barras para latencia, jitter, descarga, subida y pérdida
  const dataLatencia = {
    labels: promediosUltimaHora.map(p => p.servidor),
    datasets: [
      {
        label: 'Latencia Promedio (ms) de la última hora',
        data: promediosUltimaHora.map(p => p.latencia_promedio),
        backgroundColor: coloresServidores,
      },
    ],
  };

  const dataJitter = {
    labels: promediosUltimaHora.map(p => p.servidor),
    datasets: [
      {
        label: 'Jitter Promedio (ms) de la última hora',
        data: promediosUltimaHora.map(p => p.jitter_promedio),
        backgroundColor: coloresServidores,
      },
    ],
  };

  const dataDescarga = {
    labels: promediosUltimaHora.map(p => p.servidor),
    datasets: [
      {
        label: 'Descarga Promedio (Mbps) de la última hora',
        data: promediosUltimaHora.map(p => p.descarga_promedio),
        backgroundColor: coloresServidores,
      },
    ],
  };

  const dataSubida = {
    labels: promediosUltimaHora.map(p => p.servidor),
    datasets: [
      {
        label: 'Subida Promedio (Mbps) de la última hora',
        data: promediosUltimaHora.map(p => p.subida_promedio),
        backgroundColor: coloresServidores,
      },
    ],
  };

  const dataPerdida = {
    labels: promediosUltimaHora.map(p => p.servidor),
    datasets: [
      {
        label: 'Pérdida Promedio (%) de la última hora',
        data: promediosUltimaHora.map(p => p.perdida_promedio),
        backgroundColor: coloresServidores,
      },
    ],
  };

  return (
    <Container maxWidth="lg" sx={{ marginTop: '20px', backgroundColor: '#f4f4f4', padding: '20px', borderRadius: '8px' }}>
      <Typography variant="h4" gutterBottom>
        Medición de parámetros de Internet
      </Typography>

      <Box sx={{ marginBottom: '20px' }}>
        <Card sx={{ padding: '20px', borderRadius: '8px', backgroundColor: '#ffffff' }}>
          <Typography variant="h6" gutterBottom>
            Filtros de Búsqueda
          </Typography>
          <Grid container spacing={2}>
            {/* Parámetro */}
            <Grid item xs={12}>
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
                <Typography variant="caption" color="textSecondary">
                  Selecciona el parámetro que deseas ver.
                </Typography>
              </FormControl>
            </Grid>

            {/* Fecha */}
            <Grid item xs={12}>
              <FormControl fullWidth>
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
                <Typography variant="caption" color="textSecondary">
                  Selecciona la fecha en la que quieres ver las mediciones.
                </Typography>
              </FormControl>
            </Grid>

            {/* Hora de Inicio */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <TextField
                  label="Hora de Inicio"
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  fullWidth
                />
                <Typography variant="caption" color="textSecondary">
                  Selecciona la hora de inicio en la que quieres ver las mediciones.
                </Typography>
              </FormControl>
            </Grid>

            {/* Hora de Fin */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <TextField
                  label="Hora de Fin"
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  fullWidth
                />
                <Typography variant="caption" color="textSecondary">
                  Selecciona la hora de fin en la que quieres ver las mediciones.
                </Typography>
              </FormControl>
            </Grid>

            {/* Botón de Buscar */}
            <Grid item xs={12}>
              <Button variant="contained" onClick={buscarMedicionesRango} sx={{ marginTop: '10px' }}>
                Buscar Mediciones por Rango
              </Button>
            </Grid>
          </Grid>
        </Card>
      </Box>
      
      <Grid container spacing={4}>
        <Grid item xs={12}>
          <Card sx={{ boxShadow: 3, backgroundColor: '#ffffff', borderRadius: '8px', padding: '20px' }}>
            <CardContent>
              {/* Descripción del gráfico */}
              <Typography variant="h6" gutterBottom>
                Mediciones según el parámetro y tiempo seleccionado.
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Puedes acercar y alejar usando el scroll del mouse o arrastrar horizontalmente para explorar los datos.
              </Typography>
              
              {/* Gráfico de líneas con zoom */}
              <Line id="lineChart" data={dataEnVivo} options={lineOptions} />

              {/* Botón para restablecer zoom */}
              <Button variant="outlined" onClick={() => ChartJS.getChart('lineChart').resetZoom()} sx={{ marginTop: '10px' }}>
                Restablecer Zoom
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 3, backgroundColor: '#ffffff', borderRadius: '8px' }}>
            <CardContent>
              <Bar data={dataLatencia} options={barOptions('Latencia Promedio (ms) de la última hora')} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 3, backgroundColor: '#ffffff', borderRadius: '8px' }}>
            <CardContent>
              <Bar data={dataJitter} options={barOptions('Jitter Promedio (ms) de la última hora')} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 3, backgroundColor: '#ffffff', borderRadius: '8px' }}>
            <CardContent>
              <Bar data={dataDescarga} options={barOptions('Descarga Promedio (Mbps) de la última hora')} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 3, backgroundColor: '#ffffff', borderRadius: '8px' }}>
            <CardContent>
              <Bar data={dataSubida} options={barOptions('Subida Promedio (Mbps) de la última hora')} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 3, backgroundColor: '#ffffff', borderRadius: '8px' }}>
            <CardContent>
              <Bar data={dataPerdida} options={barOptions('Pérdida Promedio (%) de la última hora')} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;

