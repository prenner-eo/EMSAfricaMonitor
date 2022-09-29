/*
    Google Earth Engine App for EMSAfrica
    
    Created by Paul Renner 2022
    Friedrich Schiller University Jena
    
    Citations
    Braaten, Justin (2021): Landsat Time Series Explorer
    (https://github.com/jdbcode/ee-rgb-timeseries/blob/main/landsat-timeseries-explorer.js)
    
    Multiple Contributors (2020): Image mosaic/composite creation for Landsat and Sentinel-2 in Google Earth Engine - Cloudmask
    (https://open-mrv.readthedocs.io/en/latest/image_composite_Web.html)
    
    Principe, Rodrigo E. (2019): GEEtools-code-editor Tools
    (https://github.com/fitoprincipe/geetools-code-editor/blob/51fa835dfaabe73fa238fe1f3ce0c98118ded244/_tools/map)
    
    Staridas Geography (2020): Hillshade
    (https://code.earthengine.google.com/d136f0a45cee76a89ed45384dc376793 from https://www.staridasgeography.gr/)
    
    Acknowledgment
    Funded by the Federal Ministry of Education and Research (BMBF)
    as part of EMSAfrica within SPACES II.
*/

// #################################
// ########## IMPORT      ##########
// #################################

var s2sr = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED"),
    dtm1m = ee.Image("users/prenner_eo/KNP_dtm_1m"),
    dsm1m = ee.Image("users/prenner_eo/KNP_dsm_1m"),
    GSWM = ee.Image("JRC/GSW1_3/GlobalSurfaceWater"),
    knparea = ee.FeatureCollection("users/prenner_eo/KNP_Area");

// #################################
// ########## PARAMETER   ##########
// #################################

// URL
var initRun = 'false';
var runUrl = ui.url.get('run', initRun);
ui.url.set('run', runUrl);

var initLon = 30.82863920230089;
var lonUrl = ui.url.get('lon', initLon);
ui.url.set('lon', lonUrl);

var initLat = -25.00466212563505;
var latUrl = ui.url.get('lat', initLat);
ui.url.set('lat', latUrl);

var initStart = 2019;
var startUrl  = ui.url.get('start', initStart);
ui.url.set('start', startUrl);

var initEnd = 2022;
var endUrl  = ui.url.get('end', initEnd);
ui.url.set('end', endUrl);

//var initIndex = 'RGB';
var initIndex = 'Plant Health (NDVI)';
var indexUrl = ui.url.get('index', initIndex);
ui.url.set('index', indexUrl);

// ROI
var COORDS = null;
var CLICKED = false;
var visParams = null;

// #################################
// ########## UI ELEMENTS ##########
// #################################
// COLORS
// Background Colors
var coloryear = '#E7FFD6'; //'#E0FFCC';
var colorindices = '#CCF2B3'; //'#FFEDC6';
var colorexternal = '#9FD17D'; //'#FFE1E1';
// Shape Colors
var AOI_COLOR = 'ffffff';

// STYLE & FONT
// Titel
var titelFont = {fontSize: '18px', fontWeight: 'bold', margin: '4px 8px 4px 8px', stretch: 'horizontal', textAlign: 'center'};
// Header
var headerFont = {fontSize: '13px', fontWeight: 'bold', margin: '4px 8px 4px 8px'};
var headerFontyear = {fontSize: '13px', fontWeight: 'bold', margin: '4px 8px 4px 8px', backgroundColor: coloryear};
var headerFontindex = {fontSize: '13px', fontWeight: 'bold', margin: '4px 8px 4px 8px', backgroundColor: colorindices};
var headerFontexternal = {fontSize: '13px', fontWeight: 'bold', margin: '4px 8px 4px 8px', backgroundColor: colorexternal};
// Text
var textFont = {fontSize: '12px', whiteSpace: 'pre'};
var textFontyellow = {fontSize: '12px', whiteSpace: 'pre', backgroundColor: '#FFFF00'};
var textFontcenter = {fontSize: '12px', whiteSpace: 'pre', textAlign: 'center'};
var textFontyear = {fontSize: '12px', backgroundColor: coloryear, whiteSpace: 'pre', margin: '0px 8px 0px 8px'};
var textFontexternal = {fontSize: '12px', backgroundColor: colorexternal, whiteSpace: 'pre', margin: '0px 8px 2px 8px'};
// Info
var infoFontyear = {fontSize: '11px', color: '#505050', backgroundColor: coloryear};
var infoFonttext = {fontSize: '11px', color: '#505050', margin:'0px 16px 0px 16px'};
var infoFontindex = {fontSize: '12px'};
var infoFont = {fontSize: '11px', color: '#505050', whiteSpace: 'pre'};
// Button
var buttonStyle = {fontSize: '18px', fontWeight: 'bold', margin: '4px 8px 4px 8px', stretch: 'horizontal', textAlign: 'center'};
// Hyperlinks
var linkstyleexternal = {fontSize: '12px', stretch: 'horizontal', textAlign: 'center',  margin: '0px 8px 6px 8px',  color: 'darkblue', backgroundColor: colorexternal};
var githubwikilink = {fontSize: '16px', margin: '4px 8px 8px 8px', stretch: 'horizontal', color: 'darkblue', textAlign: 'center'};
var githublink = {fontSize: '12px', margin: '4px 8px 8px 8px', stretch: 'horizontal', color: 'darkblue', textAlign: 'center'};


// PANEL
var settingPanel = ui.Panel({
  style: {position: 'top-left', width: '280px'}});
  
var galleryPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal', true),
  style: {position: 'top-right', height: '60%'}});
  
var chartPanel = ui.Panel({
  style: {position: 'bottom-right'}});

var headPanel = ui.Panel({
  style: {backgroundColor: '#FFFFFF'}
});

var yearPanel = ui.Panel({
  style: {backgroundColor: coloryear, margin:'6px'}
});

var indicesPanel = ui.Panel({
  style: {backgroundColor: colorindices, margin:'6px'}
});

var externaldata = ui.Panel({style: {backgroundColor: colorexternal, margin:'6px'}});

var map = ui.Map();

var gallerychartPanel = ui.Panel(ui.SplitPanel({
  firstPanel: galleryPanel,
  secondPanel: chartPanel,
  orientation: 'vertical'}));

var splitMapGallery = ui.Panel(ui.SplitPanel({
  firstPanel: map,
  secondPanel: gallerychartPanel,
  orientation: 'horizontal'}));
  
var splitPanel = ui.SplitPanel(settingPanel,splitMapGallery);

var waitMsgImgPanel = ui.Label({
  value: '⚙️' + ' Processing, please wait.',
  style: {
    stretch: 'horizontal',
    textAlign: 'center',
    backgroundColor: '#FFFFFF'
  }});
var clickmapbox = ui.Label({
  value: 'Click on the map at your point of interest to get started.',
  style: {
    stretch: 'horizontal',
    position: 'top-center',
    backgroundColor: '#FFFF00'
}});

// Index Library
// Indices 'IndexSelectName': [calculate index, visParams for GalleryView, chart true or false, description of index, short info]
var indices = {
  'Visible Light (RGB)': [{bands: ['B4', 'B3', 'B2'], min:0, max:3000,},
                  false,
                  null, 
                  'The true color or ‘RGB’ composite uses visible light bands red, green and blue in a combination, resulting in a naturally colored image. This composite represents a good representation of the Earth as humans would see it naturally.'],
  // without Chart 
  'Agriculture':  [{bands: ['B11', 'B8', 'B2'], min:0, max:3000,},
                  false,
                  null,
                  'The agriculture band combination uses SWIR-1 (B11), near-infrared (B8), and blue (B2). It’s mostly used to monitor the health of crops because of how it uses short-wave and near-infrared. Both these bands are particularly good at highlighting dense vegetation that appears as dark green.'],
  'Plant Health (NDVI)': [{bands: ['NDVI'], min: -0.5, max: 1, palette: ['C4022F','FF7847','F7FFAD','8BCC68','066634']},
                        true,
                        'NDVI',
                        'The Normalized Difference Vegetation Index (NDVI) is used to separate states of vegetation health. As greater chlorophyll content (greater NDVI value) leads to increased reflection of near-infrared (NIR) and green wavelengths, the NDVI can monitor important parameters such as water stress in plants.',
                        'water stress in plants'],
  'Burnt Area (NBR)': [{bands: ['NBR'], min: -0.5, max: 1, palette: ['red', 'F5ECBC', 'green']},
                true,
                'NBR',
                'The NBR is used to identify burned areas and provide a measure of burn severity. It is calculated as a ratio between the NIR and SWIR values. ',
                ''
                ],
  'Vegetation Moisture (NDMI)' :[{bands: ['NDMI'], min: -0.5, max: 0.5, palette: ['FFE3CF','FFE6EB','C9BFFF','7581FF','0F23FB']},
                    true, 
                    'NDMI',
                    'The NDMI is sensitive to moisture levels in vegetation. It is used to monitor droughts as well as monitor fuel levels in fire-prone areas. It uses NIR and SWIR bands to create a ratio designed to mitigate illumination and atmospheric effects.',
                    ''
                    ],
  'Bare Soil Adjusted Vegetation (MSAVI)':  [{bands: ['MSAVI'], min: -1, max: 1, palette: ['174499','4AA0D9','D9EDED','44B86E','378C31']},
              true,
              'MSAVI',
              'The MSAVI is an index designed to provide accurate data due to low vegetation or a lack of chlorophyll in the plants. It reduces the effect of the soil on the calculation of vegetation density in the field.',
              ''
              ],
//  '(S2REP)': [{bands: ['S2REP'], min: 600, max: 800, palette: ['C4022F','FF7847','F7FFAD','8BCC68','066634']},
//             true,
//             'S2REP'],
  'Bare Soil (BSI)':  [{bands: ['BSI'], min: -0.5, max: 0.5, palette: ['004A11','3D8549','F7FFAD','FF7847','FF0800']},
            true,
            'BSI',
            'The BSI shows all vegetation in green and barren ground in red colors. Water appears black. This index helps to discriminate the status of crops (growing, not yet growing), detect recent deforestation and monitor droughts. It can also be used to detect landslides or determine the extent of erosion in non-vegetated areas.',
            ''
            ],
};

// TEXT ####################
// App Name
var appname = ui.Label(
  'EMSAfrica Monitor',
  titelFont, 'https://www.emsafrica.org/');
  
// Info Button
var introtext = ui.Label({
  value: 'The EMSAfrica Monitor aims to provide easy-to-understand information for decision-making ranging from academic to governmental levels. This open-source tool offers you the possibility to analyze time series metrics derived from multi-temporal Sentinel data. You can calculate indices, investigate monthly composites, import additional data sets and learn about new remote sensing products that are relevant to your area of interest.',
  style: infoFonttext
});
var infobutton = ui.Label({
  value: 'About this App (GitHub Wiki)', style: githubwikilink, targetUrl: 'https://github.com/prenner-eo/EMSAfricaMonitor/wiki/EMSAfrica-Monitor'
});
var sourceinfo = ui.Label({
  value: 'This GEE App was created by\nPaul Renner (FSU Jena) &\nKai Heckel (FSU Jena, Supervision)\nto contribute to the SPACES II project EMSAfrica.',
  style: infoFont
});
var sourcebutton = ui.Label({
  value: 'Source Code (GitHub)', style: githublink, targetUrl: 'https://github.com/prenner-eo/EMSAfricaMonitor/blob/main/geeEMSMonitor-code.js'
});
  
var infoIndices = ui.Label(
  indices[ui.url.get('index')][3],
  infoFontindex);
  
// YEAR
// Date
var yearhead = ui.Label(
  'Select duration of interest:',
  headerFontyear);
  
var yearinfo =ui.Label(
  '(Dataset temporal availability: 2017-today) Earliest possible start year in Southern Africa is 2019 due to the selected Earth Engine image collection and its coverage.',
  infoFontyear);
  
var firstdatetext = ui.Label({
  value: 'Start Year (YYYY)',
  style: textFontyear});
  
var seconddatetext = ui.Label({
  value: 'End Year (YYYY)',
  style: textFontyear});

var firstdatepick = ui.Textbox({
  placeholder: ui.url.get('start'),
  value: ui.url.get('start'),
  style: {maxWidth: '90px'}});
  
var seconddatepick = ui.Textbox({
  placeholder: ui.url.get('end'),
  value: ui.url.get('end'),
  style: {maxWidth: '90px'}});

var months = ee.List.sequence(1, 12);
var years = ee.List.sequence(ui.url.get('start'),ui.url.get('end'));

var datepick = ui.Panel({widgets:[firstdatetext, seconddatetext, firstdatepick, seconddatepick],
  layout: ui.Panel.Layout.flow('horizontal', true),
  style: {backgroundColor: coloryear}
});

// Submit Button
var submitbutton = ui.Button({
  label: 'Submit Years', style: buttonStyle
});

// INDICES
var indexhead = ui.Label(
  'Choose an index from the list:',
  headerFontindex);
// Drop Down Menu
var indexselect = ui.Select({
  items: Object.keys(indices),
  //placeholder: ui.url.get('index'),
  value: ui.url.get('index'),
  style: buttonStyle,
  onChange: function(key){
    infoIndices.setValue(indices[key][3]);
    handleSubmit();
  }
});

// EMSAfirca DATA
var emsdataheadline = ui.Label({
  value: 'EMSAfrica Data to view:',
  style: headerFontexternal});
// DMC
var linkdmc = ui.Label('More information in the related publication.', linkstyleexternal,'https://koedoe.co.za/index.php/koedoe/article/view/1679/2919');
var linkdmcdownload = ui.Label('Download the Data here.', linkstyleexternal,'http://dx.doi.org/10.5285/deab4235f1ef4cd79b73d0cbf2655bd7');

var headdmc = ui.Label('Digital Mapping Camera (DMC) Products\n(Only available for Kruger National Park, SA)\nwith 1 meter resolution:', textFontexternal);

var button2 = ui.Button({
  label: 'DMC Digital Surface Model (DSM)', style: buttonStyle
});
var button3 = ui.Button({
  label: 'DMC Digital Terrain Model (DTM)', style: buttonStyle
});

// EXTERNAL DATA
var externalheadline = ui.Label({
  value: 'External Data to add to the map:',
  style: headerFontexternal});
// ESA World Cover
var headesaworldcover = ui.Label('Landcover Product 2020 10m (ESA):', textFontexternal);
var buttonesaworldcover = ui.Button({
  label: 'World Cover', style: buttonStyle
});
var sourceesaworldcover = ui.Label('Source: ESA 2020' ,linkstyleexternal, 'https://esa-worldcover.org/en');
// Terra Vegetation Continuous Fields Yearly Global 250m
var headTerraVeg = ui.Label('Tree Cover 2020 250m (Terra MODIS):', textFontexternal);
var buttonTerraVeg = ui.Button({
  label: 'Tree Cover', style: buttonStyle
});
var sourceTerraVeg = ui.Label('Source: NASA 2020',linkstyleexternal, 'https://lpdaac.usgs.gov/products/mod44bv006/');
// RESOLVE Ecoregions 2017
var headEcoregion = ui.Label('Ecoregions 2017 (Resolve):', textFontexternal);
var buttonEcoregion = ui.Button({
  label: 'Ecoregions', style: buttonStyle
});
var sourceEcoregion = ui.Label('Source: Resolve (2017)',linkstyleexternal, 'https://ecoregions.appspot.com/');
// World Settlement Footprint 2015
var headSettlement = ui.Label('World Settlement Footprint 2015 10m (DLR):', textFontexternal);
var buttonSettlement = ui.Button({
  label: 'World Settlement Footprint', style: buttonStyle
});
var sourceSettlement = ui.Label('Source: DLR (2020)',linkstyleexternal, 'https://www.dlr.de/blogs/en/all-blog-posts/world-settlement-footprint-where-do-humans-live.aspx');
// SRTM
var headSRTM = ui.Label('SRTM Digital Elevation Model 2000 30m (NASA):', textFontexternal);
var buttonSRTM = ui.Button({
  label: 'SRTM DEM', style: buttonStyle
});
var sourceSRTM = ui.Label('Source: NASA (2013)',linkstyleexternal, 'https://cmr.earthdata.nasa.gov/search/concepts/C1000000240-LPDAAC_ECS.html');

// CHART & GALLERY PANEL
var infotextslider = ui.Label({
  value: "If you don't see the message above the slider, please pull the slider down.",
  style: textFontyellow
});
var infotextchart = ui.Label({
  value: '\n\n\n\n Here the index chart will be displayed once you click the submit years button or click the map.',
  style: textFont
});
var infotextgallery = ui.Label({
  value: "Here the gallery view will be displayed once you click the submit years button or click the map.\n\n\n\nHow to use the EMSAfrica Monitor?\n\nClick on the map to define your point of interest.\nDefine the years you are interested in.\nChoose an index from the list.\nYou can also view EMSAfrica products and external datasets.",
  style: textFont
});
var headlineindexinfo = ui.Label({
  value: 'Index Information:',
  style: headerFont
});

// #################################
// ########## FUNCTIONS   ##########
// #################################

// MAP FUNCTIONS

function clearImgs() {
  galleryPanel.clear();
}

// Create S2 Monthly Composite per year Time Series 
function monthlycomposite(region,years,months) {
  var col = s2sr.filterBounds(region);
  // add all Indices to the composite
  // NDVI Function
  var addNDVI = function(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
  };
  // NBR Function
  var addNBR = function(image) {
  var nbr = image.normalizedDifference(['B8', 'B12']).rename('NBR');
  return image.addBands(nbr);
  };
  // NDMI Function
   var addNDMI = function(image) {
  var ndmi = image.normalizedDifference(['B8', 'B11']).rename('NDMI');
  return image.addBands(ndmi);
  }; 
  // MSAVI Function
   var addMSAVI = function(image) {
  var msavi = image.select('B8').multiply(2).add(1)
  .subtract(image.select('B8').multiply(2).add(1).pow(2)
    .subtract(image.select('B8').subtract(image.select('B4')).multiply(8)).sqrt()
  ).divide(2).rename('MSAVI');
  return image.addBands(msavi);
  };
  // S2REP Function
  var addS2REP = function(image) {
  var s2rep = image.expression('705 + 35*((RED+ VNIR3)/2-VNIR)/(VNIR2-VNIR)',{
    'RED': image.select('B4'),
    'VNIR': image.select('B5'),
    'VNIR2': image.select('B6'),
    'VNIR3': image.select('B7')
  }).rename('S2REP');
  return image.addBands(s2rep);
  };
  // BSI Function
  var addBSI = function(image) {
  var bsi = image.expression(
      '(( X + Y ) - (A + B)) /(( X + Y ) + (A + B)) ', {
        'X': image.select('B11'), //swir1
        'Y': image.select('B4'),  //red
        'A': image.select('B8'), // nir
        'B': image.select('B2'), // blue
  }).rename('BSI');
  return image.addBands(bsi);
  };  
  var monthlyImages =  ee.ImageCollection.fromImages(
  years.map(function (y) {
    return months.map(function(m){
    var w = col.filter(ee.Filter.calendarRange(y, y, 'year'))
           .filter(ee.Filter.calendarRange(m, m, 'month'))
           .filterMetadata('CLOUDY_PIXEL_PERCENTAGE',
                                'less_than',10)
           .map(maskS2srCloudsgallery)
           .map(addNDVI)
           .map(addNBR)
           .map(addNDMI)
           .map(addMSAVI)
           //.map(addS2REP)
           .map(addBSI)
           .mean()
           //.median()
           //.min()
           .set('system:time_start',ee.Date.fromYMD(y,m,1));
    return w.set('year', y)
           .set('month', m)
           .set('date', ee.Date.fromYMD(y,m,1).format('YYYY MM'))
           .set('system:time_start',ee.Date.fromYMD(y,m,1));
  });
}).flatten());

  return monthlyImages;
}

// Source: https://open-mrv.readthedocs.io/en/latest/image_composite_Web.html
function maskS2srClouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

function maskS2srCloudsgallery(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask);
}

// print('Sentinel-2 Filtered collection',s2Filt);

// Create Time Series Gallery View
// modified from Braaten 2021
function displayBrowseImg(col, aoiBox, aoiCircle,visParams) {
  clearImgs();
  waitMsgImgPanel.style().set('shown', true);
  galleryPanel.add(waitMsgImgPanel);
  
  //print(visParams);
  
  var dates = col.aggregate_array('date');
  //print(dates);
  
  dates.evaluate(function(dates) {
    waitMsgImgPanel.style().set('shown', false);
    dates.forEach(function(date) {
      var img = col.filter(ee.Filter.eq('date', date)).first();
      
      var aoiImg = ee.Image().byte()
        .paint(ee.FeatureCollection(ee.Feature(aoiCircle)), 1, 2)
        .visualize({palette: AOI_COLOR});
      
      var thumbnail = ui.Thumbnail({
        image: img.visualize(visParams).blend(aoiImg),
        params: {
          region: aoiBox,
          dimensions: '200',
          crs: 'EPSG:3857',
          format: 'PNG'
        }
      });
      var monthname = { '01' : ['January'], '02' : ['February'], '03' : ['March'],
      '04' : ['April'], '05' : ['May'], '06' : ['June'],
      '07' : ['July'], '08' : ['August'], '09' : ['September'],
      '10' : ['October'], '11' : ['November'], '12' : ['December']};
      
      date = monthname[date.slice(-2)][0] +' '+ date.slice(0,4);
      
      var bandcountEmpty = img.bandNames().length().eq(ee.Number(0));
      
      var imgCard = ui.Panel([
        ui.Label(date,
          {margin: '4px 4px -6px 8px', fontSize: '13px', fontWeight: 'bold'}),
        thumbnail
      ], null, {margin: '4px 0px 0px 4px' , width: 'px'});
        galleryPanel.add(imgCard);
        
        bandcountEmpty.getInfo(function(ifso){
          if (ifso) {
            imgCard.insert(1, ui.Label(
            {value: "There is no cloud-free image data available for this month.",
            style: {height: '200px',width: '200px', textAlign: 'center', position: 'middle-left'}}))
            .remove(thumbnail);
          }
        });
    });
  });
}

// Remove Layers from the map by name (Source: https://github.com/fitoprincipe/geetools-code-editor/blob/51fa835dfaabe73fa238fe1f3ce0c98118ded244/_tools/map)
function removeLayerByName(name, map) {
  var m = map || Map;
  var layers = m.layers();
  // list of layers names
  var names = [];
  layers.forEach(function(lay) {
    var lay_name = lay.getName();
    names.push(lay_name);
  });
  // get index
  var index = names.indexOf(name);
  if (index > -1) {
    // if name in names
    var layer = layers.get(index);
    m.remove(layer);
  }
}
function removePoint(){
  removeLayerByName('Sentinel-2 latest composite',map);
  removeLayerByName('Point of Interest',map);
}
function removeAllLayer(){
  removeLayerByName('Surface Water',map);
  removeLayerByName('Elevation DSM 1m',map);
  removeLayerByName('Hillshade DSM 1m',map);
  removeLayerByName('Elevation DTM 1m',map);
  removeLayerByName('Hillshade DTM 1m',map);
  removeLayerByName('Landcover 2020 10m',map);
  removeLayerByName('Tree Cover 2020 250m',map);
  removeLayerByName('Ecoregions 2017 250m',map);
  removeLayerByName('Human settlement areas 2015 10m',map);
  removeLayerByName('Background (Human settlement areas 2015)',map);
}
// ROI Points and AOI Circle Define by Map Click Function
// modified from Braaten 2021
function renderGraphics(coords,years,months,visParams) {
  // Get the clicked point and buffer it.
  var point = ee.Geometry.Point(coords);
  var aoiCircle = point.buffer(50);
  var aoiBox = point.buffer(500);
  
  // Clear previous point from the Map.
  removePoint();
  
  var endDate = ee.Date(Date.now());
  var startDate = endDate.advance(-1, 'month');
  
// Filter Sentinel-2 collection
  var s2Filt = s2sr.filterBounds(aoiBox)
                .filterDate(startDate,endDate)
                .filterMetadata('CLOUDY_PIXEL_PERCENTAGE',
                                'less_than',50)
                .map(maskS2srClouds);

  var s2composite = s2Filt.median(); // can be changed to mean, min, etc 
  // Add composite to map
  map.addLayer(s2composite,{bands:['B4','B3','B2'],min:0.02,max:0.3,
                          gamma:1.5},'Sentinel-2 latest composite');

  // Add new point to the Map.
  map.addLayer(aoiCircle, {color: AOI_COLOR}, 'Point of Interest');
  map.centerObject(aoiCircle, 14);
  
  // Load Gallery
  var monthlys2 = monthlycomposite(point,years,months);
  displayBrowseImg(monthlys2, aoiBox, aoiCircle,visParams);
  
  
  //Chart
  if (indices[indexselect.getValue()][1]===true){
    // Make a chart if index values are available.
    var chart = ui.Chart.image.series({
    imageCollection: monthlys2.select(indices[indexselect.getValue()][2]),
    region: aoiCircle,
    reducer: ee.Reducer.mean(), 
    scale: 30
    });
    // Color Gradient
    var rgbColors = 'palette:["C4022F","FF7847","F7FFAD","8BCC68","066634"]';
    rgbColors = rgbColors.slice(8);
    //print(rgbColors)
    
    // Design Chart
    var options = { 
    title: indexselect.getValue()+' indicates '+ indices[indexselect.getValue()][4]+' over time', 
    hAxis: { title: 'Month' },
    vAxis: { title: indexselect.getValue()},
                                                                // ToDo: Insert change and fitted line
    series: {
      0:{
        visibleInLegend: false,
        type: 'scatter',
      }},
    //legend: {position: 'none'},
    trendlines: {
      0:{  // add a trend line,
        type: 'linear',  
        color: 'black',
        lineWidth: 2,
        opacity: 0.5,
        labelInLegend: 'Trend',
        visibleInLegend: true,
      }},
    tooltip: {trigger: 'selection'} 
    };
    // Set values to points
    chart = chart.setOptions(options);
    chartPanel.clear();
    chartPanel.add(chart);
    chartPanel.add(headlineindexinfo);
    chartPanel.add(infoIndices);
  }
  else{
  chartPanel.clear();
  chartPanel.add(ui.Label({value: 'For this index there is no chart available.',
                          style: {stretch: 'horizontal', textAlign: 'center'}}));
  chartPanel.add(headlineindexinfo);
  chartPanel.add(infoIndices);
  }
}

// modified from Braaten 2021
function handleMapClick(coords) {
  CLICKED = true;
  COORDS = [coords.lon, coords.lat];
  map.remove(clickmapbox);
  ui.url.set('run', 'true');
  ui.url.set('lon', COORDS[0]);
  ui.url.set('lat', COORDS[1]);
  visParams=indices[indexselect.getValue()][0];
  years = ee.List.sequence(ui.url.get('start'),ui.url.get('end'));
  //print(COORDS);
  renderGraphics(COORDS,years,months,visParams);
}

function handleSubmit(){
  CLICKED = true;
  map.remove(clickmapbox);
  ui.url.set('run', 'true');
  // Set new years
  ui.url.set('start', firstdatepick.getValue());
  ui.url.set('end', seconddatepick.getValue());
  ui.url.set('index', indexselect.getValue());
  years = ee.List.sequence(ui.url.get('start'),ui.url.get('end'));
  // Set new Index
  // read coordinates and process
  COORDS = [ui.url.get('lon'), ui.url.get('lat')];
  visParams=indices[indexselect.getValue()][0];
  //print(COORDS);
  renderGraphics(COORDS,years,months,visParams);
}


// #################################
// ########## EXTERNAL DATA ########
// #################################
// Legend Panel
var legendPanel = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '5px;'
  }
});
var legendTitle = ui.Label({
  value: 'Legend',
  style: {
    fontSize: '14px',
    fontWeight: 'bold',
    margin: '0px;'
  }
});

// DMC Data

// Generating Hillshade for DMC Data code snippets from
// eARTh Engine: Turn cold pixels to a colorful Terrain
// https://code.earthengine.google.com/d136f0a45cee76a89ed45384dc376793

function demshade (image){
  var N = ee.Terrain.hillshade(image,0,36).multiply(0);
  var NE = ee.Terrain.hillshade(image,45,44).multiply(0);
  var E = ee.Terrain.hillshade(image,90,56).multiply(0);
  var SE = ee.Terrain.hillshade(image,135,68).multiply(0);
  var S = ee.Terrain.hillshade(image,180,80).multiply(0.1);
  var SW = ee.Terrain.hillshade(image,225,68).multiply(0.2);
  var W = ee.Terrain.hillshade(image,270,56).multiply(0.2);
  var NW = ee.Terrain.hillshade(image,315,44).multiply(0.5);
  
  var MULTI = N
            .add(NE)
              .add(E)
                .add(SE)
                  .add(S)
                    .add(SW)
                      .add(W)
                        .add(NW)
                        .visualize({
                          min:0,
                          max:255,
                          palette:['#000000','#ffffff'],
                          })
                        .resample('bicubic')
                        .updateMask(0.5);
                        
  var SLOPE = ee.Terrain.slope(image)
                      .multiply(2)
                      .visualize({
                        min:100,
                        max:180,
                        palette:['#ffffff','#000000']
                        })
                      .resample('bicubic')
                      .updateMask(1);
                      
  var SHADED_RELIEF = ee.ImageCollection([
                      SLOPE,
                      MULTI
                      ])
                      .mosaic()
                      .reduce(ee.Reducer.median())
                      .updateMask(1);
  return SHADED_RELIEF;
}

var SURFACE_WATER = GSWM
                    .visualize({
                      bands:['occurrence'],
                      min:0,
                      max:100,
                      palette:[
                      '#B9E9E7'
                      ]
                    })
                    .resample('bicubic')
                    .clip(knparea);

var visdmc = {
  min: 0,
  max: 750,
  palette: ['0000ff', '00ffff', 'ffff00', 'ff0000'],
};

//LEGEND
// Creates a color bar thumbnail image for use in legend from the given color palette
function makeColorBarParams(palette) {
  return {
    bbox: [0, 0, 1, 0.1],
    dimensions: '100x10',
    format: 'png',
    min: 0,
    max: 1,
    palette: palette,
  };
}

function adddmclegend(){
  // Create Legend for DMC
  var dmcpalette = ['0000ff', '00ffff', 'ffff00', 'ff0000'];
  var visdmc = {min: 0, max: 750, palette: dmcpalette};
  // Create the colour bar for the legend
  var colorBar = ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: makeColorBarParams(visdmc.palette),
    style: {stretch: 'horizontal', margin: '0px 8px', maxHeight: '24px'},
  });
  // Create a panel with three numbers for the legend
  var legendLabels = ui.Panel({
    widgets: [
      ui.Label(visdmc.min, {margin: '4px 8px'}),
      ui.Label(
        ((visdmc.max-visdmc.min) / 2+visdmc.min),
        {margin: '4px 8px', textAlign: 'center', stretch: 'horizontal'}),
      ui.Label(visdmc.max, {margin: '4px 8px'})
    ],
    layout: ui.Panel.Layout.flow('horizontal')
  });
  // Legend title
  var dmcLegendLabel = ui.Label({
    value: 'Elevation [in Meter]',
    style:{ fontSize: '12px',
      margin: '0px;'
  }});
  var legendTitle = ui.Label({
  value: 'Legend',
  style: {
    fontSize: '14px',
    fontWeight: 'bold',
    margin: '0px;'
  }
  });
  legendPanel.clear();
  // Add the legendPanel to the map
  legendPanel.add(legendTitle);
  legendPanel.add(dmcLegendLabel);
  legendPanel.add(colorBar);
  legendPanel.add(legendLabels);
}

function insertdsm(){
  removeAllLayer();
  removePoint();
  galleryPanel.clear();
  chartPanel.clear();
  adddmclegend();
  map.centerObject(knparea);                                    //ToDo: if Point is not in KNP center KNP else do nothing
  var dsm1mshade = demshade(dsm1m).clip(knparea);
  map.addLayer(dsm1mshade, null, 'Hillshade DSM 1m');
  map.addLayer(dsm1m.resample('bicubic').clip(knparea), visdmc, 'Elevation DSM 1m', null, 0.5);
  map.addLayer(SURFACE_WATER, null, 'Surface Water');
}
function insertdtm(){                                           //ToDo: if Point is not in KNP center KNP else do nothing
  removeAllLayer();
  removePoint();
  galleryPanel.clear();
  chartPanel.clear();
  adddmclegend();
  map.centerObject(knparea);
  var dtm1mshade = demshade(dtm1m).clip(knparea);
  map.addLayer(dtm1mshade, null, 'Hillshade DTM 1m');
  map.addLayer(dtm1m.resample('bicubic').clip(knparea), visdmc, 'Elevation DTM 1m', null, 0.5);
  map.addLayer(SURFACE_WATER, null, 'Surface Water');
}

// Function to add external data
// ESA World Cover 10m #############
function insertesaworldcover(){
  // Product to the Map
  var esaworldcover = ee.ImageCollection("ESA/WorldCover/v100").first();
  var vis = {bands: ['Map']};
  removeAllLayer()
  map.addLayer(esaworldcover, vis, 'Landcover 2020 10m');
  
  // Add Legend to Map
  var esaworldcoverColor = ee.List(esaworldcover.get('Map_class_palette'));
  var esaworldcoverLabel = ee.List(esaworldcover.get('Map_class_names'));
  var esaworldcoverLegend = function(Color, Label){
    var C = ui.Label({
      style: {backgroundColor: Color,
      padding: '10px',
      margin: '4px'}});
    var L = ui.Label({
      value: Label,
      style: {
      margin: '5px'
      }
    });
    return ui.Panel({
      widgets: [C, L],
      layout: ui.Panel.Layout.Flow('horizontal')
    });
  };
  var esaworldcoverLegendLabel = ui.Label({
      value: 'World Cover Classes',
      style: {fontSize: '12px',
      margin: '0px;'
    }
  });
  
  legendPanel.clear();
  legendPanel.add(legendTitle);
  legendPanel.add(esaworldcoverLegendLabel);
  for(var a = 0; a < 11; a++){
    legendPanel.add(esaworldcoverLegend(esaworldcoverColor.get(a).getInfo(), esaworldcoverLabel.get(a).getInfo()));
  }
}

// Terra Vegetation Continuous Fields Yearly Global 250m
function insertTerraVeg(){
  var dataset = ee.ImageCollection('MODIS/006/MOD44B');

var visualization = {
  bands: ['Percent_Tree_Cover'],
  min: 0.0,
  max: 100.0,
  palette: ['ffffff', '61D10A', '074b03']
};

removeAllLayer();
map.addLayer(dataset, visualization, 'Tree Cover 2020 250m');

  var TerraVegLegendLabel = ui.Label({
    value: 'Tree Cover in percent [%]',
    style: {fontSize: '12px',
    margin: '0px;'}
  });
  
  // Create Legend for Tree Cover Range
var palettetc = ['ffffff', '61D10A', '074b03'];
var vistc = {min: 0, max: 100, palette: palettetc};

// Create the colour bar for the legend
var colorBartc = ui.Thumbnail({
  image: ee.Image.pixelLonLat().select(0),
  params: makeColorBarParams(vistc.palette),
  style: {stretch: 'horizontal', margin: '0px 8px', maxHeight: '24px'},
});

// Create a panel with three numbers for the legend
var legendLabelstc = ui.Panel({
  widgets: [
    ui.Label(vistc.min, {margin: '4px 8px'}),
    ui.Label(
        ((vistc.max-vistc.min) / 2+vistc.min),
        {margin: '4px 8px', textAlign: 'center', stretch: 'horizontal'}),
    ui.Label(vistc.max, {margin: '4px 8px'})
  ],
  layout: ui.Panel.Layout.flow('horizontal')
});
  
  legendPanel.clear();
  legendPanel.add(legendTitle);
  legendPanel.add(TerraVegLegendLabel);
  legendPanel.add(ui.Panel([colorBartc, legendLabelstc]));
  
}
// RESOLVE Ecoregions 2017
function insertEcoregion(){
  var ecoRegions = ee.FeatureCollection("RESOLVE/ECOREGIONS/2017");

// patch updated colors
var colorUpdates = [
{ECO_ID: 204, COLOR: '#B3493B'},
{ECO_ID: 245, COLOR: '#267400'},
{ECO_ID: 259, COLOR: '#004600'},
{ECO_ID: 286, COLOR: '#82F178'},
{ECO_ID: 316, COLOR: '#E600AA'},
{ECO_ID: 453, COLOR: '#5AA500'},
{ECO_ID: 317, COLOR: '#FDA87F'},
{ECO_ID: 763, COLOR: '#A93800'},
];

// loop over all other features and create a new style property for styling
// later on
ecoRegions = ecoRegions.map(function(f) {
  var color = f.get('COLOR');
  return f.set({style: {color: color, width: 0}});
});

// make styled features for the regions we need to update colors for,
// then strip them from the main asset and merge in the new feature
for (var i=0; i < colorUpdates.length; i++) {
  colorUpdates[i].layer = ecoRegions
      .filterMetadata('ECO_ID','equals',colorUpdates[i].ECO_ID)
      .map(function(f) {
        return f.set({style: {color: colorUpdates[i].COLOR, width: 0}});
      });

  ecoRegions = ecoRegions
      .filterMetadata('ECO_ID','not_equals',colorUpdates[i].ECO_ID)
      .merge(colorUpdates[i].layer);
}

// use style property to color shapes
var imageRGB = ecoRegions.style({styleProperty: 'style'});
legendPanel.clear();
removeAllLayer();
map.addLayer(imageRGB, {}, 'Ecoregions 2017 250m');
}
// World Settlement Footprint 2015
function insertSettlement(){
  var dataset = ee.Image("DLR/WSF/WSF2015/v1");

var opacity = 0.75;
var blackBackground = ee.Image(0);

var legendColor = ui.Label({
      style: {backgroundColor: 'ff0000',
      padding: '10px',
      margin: '4px'}});
var legendLable = ui.Label({
      value: 'Human Settlement Areas',
      style: {
      margin: '5px'
      }
    });
var settlementLegend = ui.Panel({widgets: [legendColor, legendLable],
      layout: ui.Panel.Layout.Flow('horizontal')
    });
    
legendPanel.clear();
legendPanel.add(legendTitle);
legendPanel.add(settlementLegend);

removeAllLayer();
map.addLayer(blackBackground, null, "Background (Human settlement areas 2015)", true, opacity);

var visualization = {
  min: 0,
  max: 255,
  palette: ['000000','ff0000']
};
map.addLayer(dataset, visualization, "Human settlement areas 2015 10m");
}
// SRTM
var vissrtm = {
  min: -100,
  max: 3000,
  palette: ['0000ff', '00ffff', 'ffff00', 'ff0000'],
};

function addsrtmlegend(){
  // Create Legend for DMC
  var dempalette = ['0000ff', '00ffff', 'ffff00', 'ff0000'];
  var visdem = {min: -100, max: 3000, palette: dempalette};
  // Create the colour bar for the legend
  var colorBar = ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: makeColorBarParams(visdem.palette),
    style: {stretch: 'horizontal', margin: '0px 8px', maxHeight: '24px'},
  });
  // Create a panel with three numbers for the legend
  var legendLabels = ui.Panel({
    widgets: [
      ui.Label(visdem.min, {margin: '4px 8px'}),
      ui.Label(
        ((visdem.max-visdem.min) / 2+visdem.min),
        {margin: '4px 8px', textAlign: 'center', stretch: 'horizontal'}),
      ui.Label(visdem.max, {margin: '4px 8px'})
    ],
    layout: ui.Panel.Layout.flow('horizontal')
  });
  // Legend title
  var demLegendLabel = ui.Label({
    value: 'Elevation [in Meter]',
    style:{ fontSize: '12px',
      margin: '0px;'
  }});
  var legendTitle = ui.Label({
  value: 'Legend',
  style: {
    fontSize: '14px',
    fontWeight: 'bold',
    margin: '0px;'
  }
  });
  legendPanel.clear();
  // Add the legendPanel to the map
  legendPanel.add(legendTitle);
  legendPanel.add(demLegendLabel);
  legendPanel.add(colorBar);
  legendPanel.add(legendLabels);
}

function insertSRTM(){
  var srtmdata = ee.Image("CGIAR/SRTM90_V4");
  removeAllLayer();
  removePoint();
  addsrtmlegend();
  var srtmshade = demshade(srtmdata);
  map.addLayer(srtmshade, null, 'Hillshade DTM 1m');
  map.addLayer(srtmdata.resample('bicubic'), vissrtm, 'SRTM Digital Elevation Model', null, 0.5);
  map.addLayer(SURFACE_WATER, null, 'Surface Water');
}


// Link Funcitons to Buttons
buttonesaworldcover.onClick(insertesaworldcover);
buttonTerraVeg.onClick(insertTerraVeg);
buttonEcoregion.onClick(insertEcoregion);
buttonSettlement.onClick(insertSettlement);
buttonSRTM.onClick(insertSRTM);
button2.onClick(insertdsm);
button3.onClick(insertdtm);

// #################################
// ########## UI INIT     ##########
// #################################

// Create UI Panel Head
headPanel.add(appname);
headPanel.add(introtext);
headPanel.add(infobutton);

// Create UI Panel Years
yearPanel.add(yearhead);
yearPanel.add(yearinfo);
yearPanel.add(datepick);
yearPanel.add(submitbutton);

// Create UI Panel Indices
indicesPanel.add(indexhead);
indicesPanel.add(indexselect);


// Create UI Panel External Data
externaldata.add(emsdataheadline);
externaldata.add(headdmc);
externaldata.add(button2);
externaldata.add(button3);
externaldata.add(linkdmc);
externaldata.add(linkdmcdownload);

externaldata.add(externalheadline);

externaldata.add(headesaworldcover);
externaldata.add(buttonesaworldcover);
externaldata.add(sourceesaworldcover);

externaldata.add(headTerraVeg);
externaldata.add(buttonTerraVeg);
externaldata.add(sourceTerraVeg);

externaldata.add(headEcoregion);
externaldata.add(buttonEcoregion);
externaldata.add(sourceEcoregion);

externaldata.add(headSettlement);
externaldata.add(buttonSettlement);
externaldata.add(sourceSettlement);

externaldata.add(headSRTM);
externaldata.add(buttonSRTM);
externaldata.add(sourceSRTM);

// add Panels to SettingPanel
settingPanel.add(headPanel);
settingPanel.add(yearPanel);
settingPanel.add(indicesPanel);
settingPanel.add(externaldata);
settingPanel.add(sourceinfo);
settingPanel.add(sourcebutton);

map.onClick(handleMapClick);
submitbutton.onClick(handleSubmit);

map.style().set('cursor', 'crosshair');
map.setCenter(25, -27, 5);
map.add(clickmapbox);
map.add(legendPanel);

chartPanel.add(infotextslider);
chartPanel.add(infotextchart);
galleryPanel.add(infotextgallery);

ui.root.clear();
ui.root.add(splitPanel);

if(ui.url.get('run')) {
  CLICKED = true;
  COORDS = [ui.url.get('lon'), ui.url.get('lat')];
  visParams=indices[indexselect.getValue()][0];
  renderGraphics(COORDS,years,months,visParams);
  map.remove(clickmapbox);
}
