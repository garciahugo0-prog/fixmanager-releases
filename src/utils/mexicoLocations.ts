/**
 * Catálogo geográfico para la configuración de ubicación y direcciones en FixManager
 */

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

export const COUNTRIES_LIST: CountryOption[] = [
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦' },
  { code: 'OTHER', name: 'Otro País', flag: '🌐' },
];

export interface MexicoStateData {
  state: string;
  municipalities: string[];
}

export const MEXICO_STATES_DATA: Record<string, string[]> = {
  'Aguascalientes': ['Aguascalientes', 'Asientos', 'Calvillo', 'Cosío', 'Jesús María', 'Pabellón de Arteaga', 'Rincón de Romos', 'San José de Gracia', 'Tepezalá', 'El Llano', 'San Francisco de los Romo'],
  'Baja California': ['Ensenada', 'Mexicali', 'Playas de Rosarito', 'Tecate', 'Tijuana', 'San Quintín', 'San Felipe'],
  'Baja California Sur': ['Comondú', 'Mulegé', 'La Paz', 'Los Cabos', 'Loreto'],
  'Campeche': ['Calkiní', 'Campeche', 'Carmen', 'Champotón', 'Hecelchakán', 'Hopelchén', 'Palizada', 'Tenabo', 'Escárcega', 'Calakmul', 'Candelaria', 'Seybaplaya', 'Dzitbalché'],
  'Chiapas': ['Tuxtla Gutiérrez', 'San Cristóbal de las Casas', 'Tapachula', 'Comitán de Domínguez', 'Palenque', 'Chiapa de Corzo', 'Ocosingo', 'Villaflores', 'Tonalá', 'Arriaga', 'Cintalapa'],
  'Chihuahua': ['Chihuahua', 'Ciudad Juárez', 'Cuauhtémoc', 'Delicias', 'Hidalgo del Parral', 'Nuevo Casas Grandes', 'Camargo', 'Jiménez', 'Meoqui', 'Ojinaga', 'Guachochi'],
  'Ciudad de México': ['Álvaro Obregón', 'Azcapotzalco', 'Benito Juárez', 'Coyoacán', 'Cuajimalpa de Morelos', 'Cuauhtémoc', 'Gustavo A. Madero', 'Iztacalco', 'Iztapalapa', 'La Magdalena Contreras', 'Miguel Hidalgo', 'Milpa Alta', 'Tláhuac', 'Tlalpan', 'Venustiano Carranza', 'Xochimilco'],
  'Coahuila': ['Saltillo', 'Torreón', 'Monclova', 'Piedras Negras', 'Acuña', 'Matamoros', 'San Pedro', 'Ramos Arizpe', 'Frontera', 'Sabinas', 'Parras'],
  'Colima': ['Colima', 'Manzanillo', 'Tecomán', 'Villa de Álvarez', 'Armería', 'Comala', 'Coquimatlán', 'Cuauhtémoc', 'Ixtlahuacán', 'Minatitlán'],
  'Durango': ['Durango', 'Gómez Palacio', 'Lerdo', 'Santiago Papasquiaro', 'Pueblo Nuevo', 'Guadalupe Victoria', 'Canatlán', 'El Salto', 'Vicente Guerrero'],
  'Guanajuato': ['León', 'Irapuato', 'Celaya', 'Salamanca', 'Guanajuato', 'Silao', 'San Miguel de Allende', 'Dolores Hidalgo', 'Valle de Santiago', 'Cortazar', 'Acámbaro', 'Pénjamo', 'Uriangato', 'Moroleón'],
  'Guerrero': ['Acapulco de Juárez', 'Chilpancingo de los Bravo', 'Iguala de la Independencia', 'Zihuatanejo de Azueta', 'Taxco de Alarcón', 'Chilapa de Álvarez', 'Tlapa de Comonfort', 'Ometepec', 'Tixtla'],
  'Hidalgo': ['Pachuca de Soto', 'Tulancingo de Bravo', 'Tula de Allende', 'Mineral de la Reforma', 'Ixmiquilpan', 'Tepeji del Río', 'Actopan', 'Huejutla de Reyes', 'Tizayuca', 'Apan'],
  'Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tonalá', 'Tlajomulco de Zúñiga', 'Puerto Vallarta', 'Lagos de Moreno', 'Tepatitlán de Morelos', 'Ciudad Guzmán (Zapotlán el Grande)', 'Ocotlán', 'Arandas', 'Ameca', 'Sayula', 'Autlán de Navarro', 'Tala'],
  'México': ['Toluca', 'Ecatepec de Morelos', 'Naucalpan de Juárez', 'Tlalnepantla de Baz', 'Nezahualcóyotl', 'Chimalhuacán', 'Cuautitlán Izcalli', 'Tultitlán', 'Atizapán de Zaragoza', 'Ixtapaluca', 'Nicolás Romero', 'Tecámac', 'Coacalco de Berriozábal', 'Chalco', 'Metepec', 'Texcoco', 'Valle de Chalco Solidaridad', 'Huixquilucan', 'Zumpango'],
  'Michoacán': ['Tangancícuaro', 'Zamora', 'Morelia', 'Uruapan', 'Jacona', 'Pátzcuaro', 'Zitácuaro', 'Apatzingán', 'La Piedad', 'Sahuayo', 'Jiquilpan', 'Los Reyes', 'Hidalgo', 'Tacámbaro', 'Maravatío', 'Lázaro Cárdenas', 'Purépero', 'Zacapu', 'Chilchota', 'Cotija', 'Yurécuaro', 'Tanhuato', 'Tingüindín', 'Peribán', 'Paracho', 'Quiroga', 'Tarímbaro', 'Zinapécuaro'],
  'Morelos': ['Cuernavaca', 'Jiutepec', 'Cuautla', 'Temixco', 'Yautepec', 'Emiliano Zapata', 'Xochitepec', 'Ayala', 'Jojutla', 'Tepoztlán'],
  'Nayarit': ['Tepic', 'Bahía de Banderas', 'Santiago Ixcuintla', 'Compostela', 'San Blas', 'Xalisco', 'Tuxpan', 'Ixtlán del Río', 'Acaponeta', 'Tecuala'],
  'Nuevo León': ['Monterrey', 'Guadalupe', 'San Nicolás de los Garza', 'Apodaca', 'General Escobedo', 'Santa Catarina', 'San Pedro Garza García', 'Juárez', 'Cadereyta Jiménez', 'García', 'Santiago', 'Linares', 'Montemorelos'],
  'Oaxaca': ['Oaxaca de Juárez', 'San Juan Bautista Tuxtepec', 'Salina Cruz', 'Juchitán de Zaragoza', 'Santa Cruz Xoxocotlán', 'Santo Domingo Tehuantepec', 'Heroica Ciudad de Huajuapan de León', 'Santa Lucía del Camino', 'San Pedro Mixtepec (Puerto Escondido)', 'Santa María Huatulco'],
  'Puebla': ['Puebla', 'Tehuacán', 'San Martín Texmelucan', 'Atlixco', 'San Pedro Cholula', 'San Andrés Cholula', 'Amozoc', 'Huauchinango', 'Teziutlán', 'Izúcar de Matamoros', 'Cuautlancingo', 'Zacatlán', 'Chignahuapan'],
  'Querétaro': ['Santiago de Querétaro', 'San Juan del Río', 'Corregidora', 'El Marqués', 'Cadereyta de Montes', 'Tequisquiapan', 'Ezequiel Montes', 'Colón', 'Pedro Escobedo', 'Jalpan de Serra'],
  'Quintana Roo': ['Cancún (Benito Juárez)', 'Playa del Carmen (Solidaridad)', 'Chetumal (Othón P. Blanco)', 'Cozumel', 'Tulum', 'Isla Mujeres', 'Felipe Carrillo Puerto', 'Puerto Morelos', 'Bacalar', 'José María Morelos', 'Lázaro Cárdenas'],
  'San Luis Potosí': ['San Luis Potosí', 'Soledad de Graciano Sánchez', 'Ciudad Valles', 'Matehuala', 'Rioverde', 'Tamazunchale', 'Cárdenas', 'Cerritos', 'Santa María del Río', 'Villa de Reyes'],
  'Sinaloa': ['Culiacán', 'Mazatlán', 'Ahome (Los Mochis)', 'Guasave', 'Navolato', 'El Fuerte', 'Salvador Alvarado (Guamúchil)', 'Escuinapa', 'Rosario', 'Mocorito'],
  'Sonora': ['Hermosillo', 'Ciudad Obregón (Cajeme)', 'Nogales', 'San Luis Río Colorado', 'Navojoa', 'Guaymas', 'Agua Prieta', 'Caborca', 'Puerto Peñasco', 'Empalme', 'Cananea', 'Magdalena'],
  'Tabasco': ['Villahermosa (Centro)', 'Cárdenas', 'Comalcalco', 'Huimanguillo', 'Macuspana', 'Cunduacán', 'Paraíso', 'Frontera (Centla)', 'Tenosique', 'Teapa'],
  'Tamaulipas': ['Reynosa', 'Matamoros', 'Nuevo Laredo', 'Ciudad Victoria', 'Tampico', 'Ciudad Madero', 'Altamira', 'El Mante', 'Río Bravo', 'Valle Hermoso', 'San Fernando'],
  'Tlaxcala': ['Tlaxcala', 'Apizaco', 'Huamantla', 'Chiautempan', 'San Pablo del Monte', 'Calpulalpan', 'Zacatelco', 'Contla de Juan Cuamatzi', 'Tetla de la Solidaridad', 'Ixtacuixtla'],
  'Veracruz': ['Veracruz', 'Xalapa', 'Coatzacoalcos', 'Córdoba', 'Poza Rica de Hidalgo', 'Minatitlán', 'Boca del Río', 'Orizaba', 'Tuxpan', 'Papantla', 'San Andrés Tuxtla', 'Martínez de la Torre', 'Cosoleacaque', 'Tierra Blanca'],
  'Yucatán': ['Mérida', 'Kanasín', 'Valladolid', 'Tizimín', 'Progreso', 'Umán', 'Tekax', 'Ticul', 'Motul', 'Hunucmá'],
  'Zacatecas': ['Zacatecas', 'Guadalupe', 'Fresnillo', 'Jerez', 'Río Grande', 'Sombrerete', 'Calera', 'Nochistlán de Mejía', 'Loreto', 'Ojocaliente', 'Tlaltenango de Sánchez Román']
};

export const USA_STATES_LIST = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

export const ALL_COUNTRIES = [
  "México", "Estados Unidos", "Colombia", "España", "Chile", "Perú", "Ecuador", "Argentina", 
  "Venezuela", "Guatemala", "Bolivia", "República Dominicana", "Honduras", "Paraguay", 
  "El Salvador", "Nicaragua", "Costa Rica", "Panamá", "Uruguay", "Puerto Rico", "Canadá",
  "Brasil", "Cuba", "Francia", "Italia", "Alemania", "Reino Unido", "Japón", "China", "Corea del Sur"
];

export const MEXICAN_STATES = Object.keys(MEXICO_STATES_DATA);

export const COLOMBIA_DEPARTMENTS = [
  "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bolívar", "Boyacá", "Caldas", "Caquetá",
  "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía", "Guaviare",
  "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander", "Putumayo",
  "Quindío", "Risaralda", "San Andrés y Providencia", "Santander", "Sucre", "Tolima",
  "Valle del Cauca", "Vaupés", "Vichada", "Bogotá D.C."
];

