import React, { useState, useEffect, useMemo } from 'react';
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
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Autocomplete,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Collapse,
  Paper
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ZoomOut as ZoomOutIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

import SpeedIcon from '@mui/icons-material/Speed';

// Importar y registrar componentes necesarios de Chart.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  zoomPlugin
);

const aliasPaises = {
  "jp": "Japón",
  "us": "Estados Unidos",
  "de": "Alemania",
  "nl": "Países Bajos",
  "fr": "Francia",
  "ca": "Canadá",
  "sg": "Singapur",
  "ch": "Suiza",
  "au": "Australia",
  "uk": "Reino Unido",
  "pl": "Polonia",
  "ro": "Rumania",
  "ar": "Argentina",
  "br": "Brasil",
  "cl": "Chile",
  "co": "Colombia",
  "es": "España",
  "mx": "México",
  "pe": "Perú",
  "ec": "Ecuador",
  "ph": "Filipinas",
  "in": "India",
  "hk": "Hong Kong",
  "gr": "Grecia",
  "nz": "Nueva Zelanda",
  "za": "Sudáfrica",
  "ve": "Venezuela",
  "al": "Albania",
  "rs": "Serbia",
  "sv": "El Salvador"
};

const etiquetasParametros = {
  descarga: "Velocidad de descarga",
  subida: "Velocidad de subida",
  latencia: "Latencia",
  jitter: "Jitter",
  perdida: "Pérdida de paquetes"
};

const cleanServerName = (serverName) => {
  if (!serverName || typeof serverName !== 'string') return 'Desconocido';
  return serverName.replace(/Speedtest by Ookla - /, '').replace(/ - \d+/, '');
};

const coloresBrillantes = [
  '#FF6384', // rosa fuerte
  '#36A2EB', // azul cielo
  '#FFCE56', // amarillo brillante
  '#4BC0C0', // cian claro
  '#9966FF', // morado suave
  '#FF9F40', // naranja claro
  '#00E676', // verde fluorescente
  '#E91E63', // rosa intenso
  '#03A9F4', // azul brillante
  '#CDDC39'  // lima claro
];
const API = process.env.REACT_APP_API_BASE;

const generateColors = (servidores) => {
  return servidores
    .filter(Boolean)
    .map((_, index) => coloresBrillantes[index % coloresBrillantes.length]);
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
  const [listaServidores, setListaServidores] = useState([]);
  const [servidoresSeleccionados, setServidoresSeleccionados] = useState([]);
  const [paisSeleccionado, setPaisSeleccionado] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [listaPaises, setListaPaises] = useState([]);
  const [mostrarEnVivo, setMostrarEnVivo] = useState(true);
  const [servidoresCargados, setServidoresCargados] = useState(false);
  const [cargandoGrafico, setCargandoGrafico] = useState(false); // NUEVO

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const mergeNewData = (oldData, newData) => {
    const existingTimestamps = oldData.map(dato => dato.timestamp);
    const mergedData = [...oldData, ...newData.filter(dato => !existingTimestamps.includes(dato.timestamp))];
    return mergedData;
  };

  const fetchMedicionesEnVivo = async () => {
    try {
      const response = await axios.get(`${API}/mediciones-recientes`);
      const mediciones = Array.isArray(response.data)
        ? response.data
        : (Array.isArray(response.data.mediciones) ? response.data.mediciones : []);

      setDatosEnVivo(prevData => mergeNewData(prevData, mediciones));
      const sinDatos = servidoresSeleccionados.filter(nombre =>
        !datosFiltrados.some(d => cleanServerName(d.servidor) === nombre)
      );
      if (sinDatos.length > 0) {
        return null;
      }
    } catch (error) {
      console.error('Error al obtener mediciones en tiempo real:', error);
    }
  };
  
  const fetchPromediosUltimaHora = async () => {
    try {
      const response = await axios.get(`${API}/promedio-ultima-hora`);
      const data = Array.isArray(response.data)
        ? response.data
        : (Array.isArray(response.data.promedios) ? response.data.promedios : []);

      setPromediosUltimaHora(data);
      const servidoresUnicos = [...new Set(data.map(p => p.servidor))];
      setServidores(servidoresUnicos);
      setColoresServidores(generateColors(servidoresUnicos));
    } catch (error) {
      console.error('Error al obtener promedios:', error);
    }
  };
  

  const redondearTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit'
    })
  };


  useEffect(() => {
    const obtenerPaises = async () => {
      try {
        const response = await axios.get(`${API}/paises-disponibles`);
        console.log("📦 Respuesta de países:", response.data);
        
        // Es un array simple, así que podemos mapearlo directamente
        const lista = response.data.map(codigo => ({
          code: codigo,
          label: aliasPaises[codigo.toLowerCase()] || codigo
        }));

        setListaPaises(lista);
      } catch (error) {
        console.error("Error al obtener países:", error);
      }
    };
    obtenerPaises();
  }, []);

  useEffect(() => {
    fetchMedicionesEnVivo();
    setDatosEnVivo([]);
    setDatosHistoricos([]);
    fetchPromediosUltimaHora();
  
    const interval = setInterval(() => {
      fetchMedicionesEnVivo();
      fetchPromediosUltimaHora();
    }, 30000);
  
    return () => clearInterval(interval);
  }, []);

  const handleFechaChange = async (event) => {
    const fecha = event.target.value;
    setFechaSeleccionada(fecha);
    
    if (fecha) {
      try {
        setLoading(true);
        const response = await axios.get(`${API}/mediciones-dia/${fecha}`);
        setDatosHistoricos(response.data);
        setMostrarEnVivo(false);
        showSnackbar(`Datos históricos cargados para ${fecha}`, 'success');
      } catch (error) {
        console.error('Error al obtener datos históricos:', error);
        showSnackbar('Error al cargar datos históricos', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const buscarMedicionesRango = async () => {
    if (!fechaSeleccionada || !horaInicio || !horaFin) {
      showSnackbar('Por favor complete todos los campos', 'warning');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(
        ` ${API}/mediciones-rango?fecha=${fechaSeleccionada}&horaInicio=${horaInicio}&horaFin=${horaFin}`
      );
      setDatosHistoricos(response.data);
      setMostrarEnVivo(false); 
      showSnackbar(`Datos encontrados: ${response.data.length} mediciones`, 'success');
    } catch (error) {
      console.error('Error al buscar mediciones por rango:', error);
      showSnackbar('Error al buscar mediciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'white',
          boxWidth: 12,
          font: {
            size: 11
          }
        }
      },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'x',
        },
        pan: {
          enabled: true,
          mode: 'x',
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: 'white', // ← color de las etiquetas del eje X
        },
        grid: {
          color: 'rgba(255,255,255,0.1)' // ← líneas de fondo eje X
        }
      },
      y: {
        ticks: {
          color: 'white' // ← color de las etiquetas del eje Y
        },
        grid: {
          color: 'rgba(255,255,255,0.1)' // ← líneas de fondo eje Y
        }
      }
    }
  };

  const barOptions = (title) => ({
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        display: false 
      },
      title: {
        display: true,
        text: title,
        color: '#FFFFFF',
        
        font: {
          size: 20,
          weight: 'bold',
        },
        padding: {
          bottom: 23  // 👈 Ajusta este valor para más o menos espacio
        }
      }
    },
    scales: {
      ...chartOptions.scales,
      x: {
        ...chartOptions.scales.x,
        ticks: {
          ...chartOptions.scales.x.ticks,
          callback: function(value) {
            const label = this.getLabelForValue(value);
            return label.length > 15 ? label.split(' ') : label;
          }
        }
      }
    }
  });
    

  const datosFiltrados = (mostrarEnVivo ? datosEnVivo : datosHistoricos).filter(d =>
    servidoresSeleccionados.length === 0 ||
    servidoresSeleccionados.map(cleanServerName).includes(cleanServerName(d.servidor))
  );
  const promediosFiltrados = servidoresSeleccionados.length > 0 
    ? promediosUltimaHora.filter(p => servidoresSeleccionados.includes(p.servidor))
    : promediosUltimaHora;

  const coloresFiltrados = servidoresSeleccionados.length > 0
    ? generateColors(servidoresSeleccionados)
    : coloresServidores;

  const lineChartData = useMemo(() => {
    const servidoresEnDatos = [...new Set(datosFiltrados.map(d => d.servidor))];
    console.log("Servidores con datos:", datosFiltrados.map(d => ({
      servidor: cleanServerName(d.servidor),
      valor: d[parametro]
    })));
    return {
      labels: [...new Set(datosFiltrados.map(d => redondearTimestamp(d.timestamp)))],
      datasets: servidoresEnDatos.map((servidor, index) => ({
        label: cleanServerName(servidor),
        data: datosFiltrados
          .filter(d => d.servidor === servidor && d[parametro] != null && !isNaN(d[parametro]))
          .map(d => d[parametro]),
        borderColor: coloresBrillantes[index % coloresBrillantes.length],
        backgroundColor: coloresBrillantes[index % coloresBrillantes.length],
        fill: false,
        tension: 0.4,
      }))
    };
  }, [datosFiltrados, parametro]);

  const createBarData = (label, dataKey) => ({
    labels: promediosFiltrados.map(p => cleanServerName(p.servidor).split(" - ")[0]),
    datasets: [{
      label,
      data: promediosFiltrados.map(p => p[dataKey]),
      backgroundColor: coloresFiltrados,
      borderRadius: 4,
    }]
  });

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#0D1321',  // un gris muy oscuro
      color: '#f0f0f0',            // texto claro
      py: 3
    }}>
      <Container maxWidth="xl">
        <Paper elevation={3} 
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
          backgroundColor: '#2C3544', // fondo azul oscuro que combina con todo tu dashboard
          color: '#FFFFFF' // texto blanco para contraste
        }}>
          <Box display="flex" alignItems="center" justifyContent="center" >
            <TrendingUpIcon sx={{ mr: 2, fontSize: 50, color: 'primary.main' }} />
            <Typography variant="h4" align="center" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Monitoreo de Indicadores de Calidad del Servicio de Internet Fijo 
            </Typography>
          </Box>
        </Paper>

        {/* Controles */}
        <Card sx={{ mb: 4, p: 3, backgroundColor: '#1C2533', color: '#ffffff' }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <SettingsIcon sx={{ mr: 1 }} />
            Filtros de Visualización
          </Typography>
          <Divider sx={{ mb: 3, borderColor: '#cccccc' }} />
          
          <Grid container spacing={3}>
            {/* Selector de País */}
            <Grid item xs={12} md={6}>
            <Autocomplete 
              options={listaPaises}
              getOptionLabel={(option) => option.label}
              value={listaPaises.find(p => p.code === paisSeleccionado) || null}
              onChange={async (event, newValue) => {
                if (newValue) {
                  setListaServidores([]);
                  setCargandoGrafico(true);
                  setLoading(true);
                  showSnackbar(`Conectando a VPN de ${newValue.label}...`, 'info');
                  try {
                    await axios.post(`${API}/conectar-vpn`, { pais: newValue.code });
                    setPaisSeleccionado(newValue.code);

                    await new Promise(resolve => setTimeout(resolve, 10000));
                    await axios.post(`${API}/seleccionar-servidores-por-pais`, {
                      pais: newValue.code,
                      cantidad: 5
                    });
                    await axios.get(`${API}/realizar-medicion`);
                    
                    const response = await axios.get(`${API}/servidores-disponibles`);
                    const servidores = Array.isArray(response.data.servidores)
                      ? response.data.servidores
                      : response.data;

                    setListaServidores(servidores);
                    setServidoresSeleccionados(servidores.map(s => `${s.nombre} - ${s.sponsor}`));
                    setServidoresCargados(true);
                    setCargandoGrafico(false); // 👈 FINALIZA LA CARGA
                    
                    await fetchMedicionesEnVivo();
                    await fetchPromediosUltimaHora();

                    if (response.data.servidores.length === 0) {
                      showSnackbar(`No se encontraron servidores para ${newValue.label}`, 'warning');
                    } else {
                      showSnackbar(`Conectado a ${newValue.label} correctamente`, 'success');
                    }
                  } catch (error) {
                    showSnackbar('Error al cambiar de país', 'error');
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#2C3544',
                  color: 'white',
                  transition: 'background-color 0.3s ease',
                  pointerEvents: loading ? 'none' : 'auto',
                  '& fieldset': {
                    borderColor: 'white',
                  },
                  '&:hover fieldset': {
                    borderColor: '#aaa',
                  },
                  ...(loading && {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)', // fondo semitransparente
                  })
                },
                '& .MuiInputLabel-root': {
                  color: 'white'                // Label del Autocomplete
                },
                '& .MuiFormHelperText-root': {
                  color: '#ccc'
                },
                '& .MuiSvgIcon-root': {
                  color: 'white'
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Seleccionar País"
                  helperText="Selecciona un país para filtrar los servidores"
                  sx={{
                    '& .MuiInputBase-root': {
                      backgroundColor: '#2C3544',
                      color: 'white',
                    },
                    '& .MuiInputLabel-root': {
                      color: 'white',
                    },
                    '& .MuiFormHelperText-root': {
                      color: '#ccc',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'white',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#bbb',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'white',
                    }
                  }}
                />
              )}
              disabled={loading}
            />
            </Grid>

            {/* Selector de Servidores */}
            <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#2C3544', color: 'white', border: '1px solid white', borderRadius: 2}}>
            <Typography variant="subtitle1" sx={{ mb: 1, color: 'white' }}>
                  Servidores Disponibles
                </Typography>
                <FormGroup>
                  {listaServidores.map((servidor, index) => {
                    const nombre = `${servidor.nombre} - ${servidor.sponsor}`;
                    return (
                      <FormControlLabel
                        key={index}
                        control={
                          <Checkbox
                            checked={servidoresSeleccionados.includes(nombre)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setServidoresSeleccionados(prev => [...prev, nombre]);
                              } else {
                                setServidoresSeleccionados(prev =>
                                  prev.filter(item => item !== nombre)
                                );
                              }
                            }}
                            sx={{
                              color: 'white',
                              '&.Mui-checked': {
                                color: 'white',
                              },
                              '& .MuiSvgIcon-root': {
                                fill: 'white',
                              }
                            }}
                          />
                        }
                        label={cleanServerName(nombre)}
                        sx={{ color: 'white' }}
                      />
                    );
                  })}
                </FormGroup>
                {loading ? (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={16} sx={{ color: '#2196f3' }} />
                    <Typography variant="body2" sx={{ color: '#cccccc' }}>
                      Cargando servidores...
                    </Typography>
                  </Box>
                ) : paisSeleccionado === '' ? (
                  <Typography variant="body2" sx={{ color: '#cccccc' }}>
                    Selecciona un país para mostrar los servidores.
                  </Typography>
                ) : listaServidores.length === 0 && (
                  <Typography variant="body2" sx={{ color: '#cccccc' }}>
                    No hay servidores disponibles.
                  </Typography>
                )}

              </Paper>
            </Grid>

            {/* Selector de Parámetro */}
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Parámetro"
                value={parametro}
                onChange={(e) => setParametro(e.target.value)}
                helperText="Selecciona el parámetro que deseas ver"
                sx={{
                  '& .MuiSvgIcon-root': {
                    color: 'white', // Esto afecta íconos internos como calendario, reloj, flechas
                  },
                  '& .MuiInputBase-root': {
                    backgroundColor: '#2C3544',
                    color: 'white',
                  },
                  '& .MuiInputLabel-root': {
                    color: 'white',
                  },
                  '& .MuiFormHelperText-root': {
                    color: '#ccc',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'white',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#bbb',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'white',
                  }
                }}
              >
                <MenuItem value="descarga">Velocidad de descarga</MenuItem>
                <MenuItem value="subida">Velocidad de subida</MenuItem>
                <MenuItem value="latencia">Latencia</MenuItem>
                <MenuItem value="jitter">Jitter</MenuItem>
                <MenuItem value="perdida">Pérdida de paquetes</MenuItem>
              </TextField>
            </Grid>

            {/* Selector de Fecha */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Fecha"
                type="date"
                value={fechaSeleccionada}
                onChange={handleFechaChange}
                InputLabelProps={{ shrink: true }}
                helperText="Selecciona fecha para datos históricos"
                
                sx={{
                  '& .MuiSvgIcon-root': {
                    color: 'white', // Esto afecta íconos internos como calendario, reloj, flechas
                  },
                  '& .MuiInputBase-root': {
                    backgroundColor: '#2C3544',
                    color: 'white',
                  },
                  '& .MuiInputLabel-root': {
                    color: 'white',
                  },
                  '& .MuiFormHelperText-root': {
                    color: '#ccc',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'white',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#bbb',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'white',
                  }
                }}
              />
            </Grid>

            {/* Hora de Inicio */}
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                label="Hora Inicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
    
                sx={{
                  '& .MuiSvgIcon-root': {
                    color: 'white', // Esto afecta íconos internos como calendario, reloj, flechas
                  },
                  '& .MuiInputBase-root': {
                    backgroundColor: '#2C3544',
                    color: 'white',
                  },
                  '& .MuiInputLabel-root': {
                    color: 'white',
                  },
                  '& .MuiFormHelperText-root': {
                    color: '#ccc',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'white',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#bbb',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'white',
                  }
                }}
              />
            </Grid>

            {/* Hora de Fin */}
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                label="Hora Fin"
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{
                  '& .MuiSvgIcon-root': {
                    color: 'white', // Esto afecta íconos internos como calendario, reloj, flechas
                  },
                  '& .MuiInputBase-root': {
                    backgroundColor: '#2C3544',
                    color: 'white',
                  },
                  '& .MuiInputLabel-root': {
                    color: 'white',
                  },
                  '& .MuiFormHelperText-root': {
                    color: '#ccc',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'white',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#bbb',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'white',
                  }
                }}
              />
            </Grid>

            {/* Botones */}
            <Grid item xs={12}>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  onClick={buscarMedicionesRango}
                  disabled={loading || !fechaSeleccionada || !horaInicio || !horaFin}
                  startIcon={loading ? <CircularProgress size={20} sx={{ color: '#2196f3' }} /> : <RefreshIcon />}
                  sx={{
                    backgroundColor: '#2196f3',        // Azul brillante
                    color: 'white',                    // Texto blanco
                    '&:hover': {
                      backgroundColor: '#1976d2'       // Azul más oscuro al pasar el mouse
                    },
                    '&.Mui-disabled': {
                      backgroundColor: '#555',         // Botón desactivado (gris)
                      color: '#ccc'
                    }
                  }}
                >
                  Buscar por Rango
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setMostrarEnVivo(true);
                    setFechaSeleccionada('');
                    setHoraInicio('');
                    setHoraFin('');
                    setDatosHistoricos([]);
                    showSnackbar('Modo en vivo activado', 'info');
                  }}
                  sx={{
                    backgroundColor: '#2196f3',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#1976d2'
                    }
                  }}
                >
                  Ver resultados en vivo
                </Button>
                <Tooltip title="Restablecer zoom en gráficos">
                  <IconButton
                    onClick={() => {
                      const chart = ChartJS.getChart('lineChart');
                      if (chart) chart.resetZoom();
                    }}
                    color="primary"
                  >
                    <ZoomOutIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Card>
        
        {cargandoGrafico ? (
          <Box textAlign="center" mt={5}>
            <CircularProgress sx={{ color: '#2196f3' }} />
            <Typography variant="body2" sx={{ mt: 2, color: '#ccc' }}>
              Cargando gráficos...
            </Typography>
          </Box>
        ) : servidoresCargados ? (
          <>
        {/* Gráfico Principal */}
        <Card sx={{ mb: 4, p: 3, backgroundColor: '#1C2533', color: '#ffffff' }}>
          <CardContent>
          {datosFiltrados.length > 0 && (
            <>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <SpeedIcon sx={{ mr: 1 }} />
                Mediciones en Tiempo Real - {etiquetasParametros[parametro]}
              </Typography>
              <Divider sx={{ mb: 3, borderColor: '#cccccc' }} />

              <Typography variant="subtitle2" sx={{ color: '#ccc', mb: 1 }}>
                Fecha: {new Date(datosFiltrados[0].timestamp).toLocaleDateString('es-PE')}
              </Typography>
            </>
          )}

            <Box sx={{ height: 400, position: 'relative' }}>
              {loading && (
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  sx={{ transform: 'translate(-50%, -50%)' }}
                  zIndex={10}
                >
                  <CircularProgress />
                </Box>
              )}
              <Line
                id="lineChart"
                data={lineChartData}
                options={chartOptions}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Gráficos de Barras */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: '#1C2533', color: '#ffffff' }}>
              <CardContent>
                <Box sx={{ height: 300 }}>
                  <Bar 
                    data={createBarData('Latencia Promedio (ms)', 'latencia_promedio')} 
                    options={barOptions('Latencia Promedio (ms) - Última Hora')} 
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: '#1C2533', color: '#ffffff' }}>
              <CardContent>
                <Box sx={{ height: 300 }}>
                  <Bar 
                    data={createBarData('Jitter Promedio (ms)', 'jitter_promedio')} 
                    options={barOptions('Jitter Promedio (ms) - Última Hora')} 
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: '#1C2533', color: '#ffffff' }}>
              <CardContent>
                <Box sx={{ height: 300 }}>
                  <Bar 
                    data={createBarData('Descarga Promedio (Mbps)', 'descarga_promedio')} 
                    options={barOptions('Descarga Promedio (Mbps) - Última Hora')} 
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: '#1C2533', color: '#ffffff' }}>
              <CardContent>
                <Box sx={{ height: 300 }}>
                  <Bar 
                    data={createBarData('Subida Promedio (Mbps)', 'subida_promedio')} 
                    options={barOptions('Subida Promedio (Mbps) - Última Hora')} 
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: '#1C2533', color: '#ffffff' }}>
              <CardContent>
                <Box sx={{ height: 300 }}>
                  <Bar 
                    data={createBarData('Pérdida Promedio (%)', 'perdida_promedio')} 
                    options={barOptions('Pérdida de Paquetes Promedio (%) - Última Hora')} 
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        </>
        ) : null}

        {/* Snackbar para notificaciones */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default Dashboard;
 