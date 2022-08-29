  /*
    Google Earth Engine App for EMSAfrica
    
    Created by Paul Renner 2022
    Friedrich Schiller University Jena
    
    Citations
    Braaten, Justin (2021): Landsat Time Series Explorer
    (https://github.com/jdbcode/ee-rgb-timeseries/blob/main/landsat-timeseries-explorer.js)
    
    Multiple Contributors (2020): Image mosaic/composite creation for Landsat and Sentinel-2 in Google Earth Engine - Cloudmask
    (https://open-mrv.readthedocs.io/en/latest/image_composite_Web.html)
    
    Staridas Geography (2020): Hillshade
    (https://code.earthengine.google.com/d136f0a45cee76a89ed45384dc376793 from https://www.staridasgeography.gr/)
    
    Acknowledgment
    Funded by the Federal Ministry of Education and Research (BMBF)
    as part of EMSAfrica within SPACES II.
*/
// #################################
// ########## IMPORT   #############
// #################################

var s2 = ee.ImageCollection("COPERNICUS/S2"),
    s2c = ee.ImageCollection("COPERNICUS/S2_CLOUD_PROBABILITY"),
    s2sr = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED"),
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
var initIndex = 'Plant Health Index';
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
var colorindices = '#CCF2B3'//'#FFEDC6';
var colorexternal = '#9FD17D'//'#FFE1E1';
// Shape Colors
var AOI_COLOR = 'ffffff';

// STYLE & FONT
// Titel
var titelFont = {fontSize: '18px', fontWeight: 'bold', margin: '4px 8px 0px 8px', stretch: 'horizontal', textAlign: 'center'};
// Header
var headerFont = {fontSize: '13px', fontWeight: 'bold', margin: '4px 8px 0px 8px'};
var headerFontyear = {fontSize: '13px', fontWeight: 'bold', margin: '4px 8px 0px 8px', backgroundColor: coloryear};
var headerFontindex = {fontSize: '13px', fontWeight: 'bold', margin: '4px 8px 0px 8px', backgroundColor: colorindices};
var headerFontexternal = {fontSize: '13px', fontWeight: 'bold', margin: '4px 8px 0px 8px', backgroundColor: colorexternal};
// Text
var textFont = {fontSize: '12px', whiteSpace: 'pre'};
var textFontyear = {fontSize: '12px', backgroundColor: coloryear, whiteSpace: 'pre'};
var textFontexternal = {fontSize: '12px', backgroundColor: colorexternal, whiteSpace: 'pre'};
// Info
var infoFontyear = {fontSize: '11px', color: '#505050', whiteSpace: 'pre', backgroundColor: coloryear};
var infoFontindex = {fontSize: '11px', color: '#505050', whiteSpace: 'pre', backgroundColor: colorindices};
// Button
var buttonStyle = {fontSize: '18px', fontWeight: 'bold', margin: '4px 8px 0px 8px', stretch: 'horizontal', textAlign: 'center'};
// Hyperlinks
var linkstyleexternal = {fontSize: '12px',  textAlign: 'justify',  padding: '8px',  margin: '0px',  backgroundColor: colorexternal};
var githublink = {fontSize: '16px', margin: '4px 8px 0px 8px', stretch: 'horizontal', textAlign: 'center'};


// PANEL
var settingPanel = ui.Panel({
  style: {position: 'top-left', width: '280px'}});
  
var galleryPanel = ui.Panel({
  layout: ui.Panel.Layout.flow('horizontal', true),
  style: {position: 'top-right', width: '30%', height: '75%'}});
  
var chartPanel = ui.Panel({
  style: {position: 'bottom-right', width: '30%', height: '25%'}});

var headPanel = ui.Panel({
  style: {backgroundColor: '#FFFFFF'}
});

var yearPanel = ui.Panel({
  style: {backgroundColor: coloryear}
});

var indicesPanel = ui.Panel({
  style: {backgroundColor: colorindices}
});

var externaldata = ui.Panel({style: {backgroundColor: colorexternal}});

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
  'RGB': [{bands: ['B4', 'B3', 'B2'], min:0, max:3000,},
                  false,
                  null, 
                  'Description text RGB', ''],
  'Plant Health Index': [{bands: ['NDVI'], min: -0.5, max: 1, palette: ['C4022F','FF7847','F7FFAD','8BCC68','066634']},
                        true,
                        'NDVI',
                        'Description text NDVI'],
  'Burn (NBR)': [{bands: ['NBR'], min: -0.5, max: 1, palette: ['red', 'F5ECBC', 'green']},
                true,
                'NBR',
                'Description text NBR'
                ],
  'Moisture (NDMI)' :[{bands: ['NDMI'], min: -0.5, max: 0.5, palette: ['FFE3CF','FFE6EB','C9BFFF','7581FF','0F23FB']},
                    true, 
                    'NDMI',
                    'Description text NDMI'],
  '(MSAVI)':  [{bands: ['MSAVI'], min: -1, max: 1, palette: ['174499','4AA0D9','D9EDED','44B86E','378C31']},
              true,
              'MSAVI',
              'Description text MSAVI'],
//  '(S2REP)': [{bands: ['S2REP'], min: 600, max: 800, palette: ['C4022F','FF7847','F7FFAD','8BCC68','066634']},
//             true,
//             'S2REP'],
  '(BSI)':  [{bands: ['BSI'], min: -0.5, max: 0.5, palette: ['004A11','3D8549','F7FFAD','FF7847','FF0800']},
            true,
            'BSI',
            'Description text BSI'],
  // without Chart 
  'Agriculture':  [{bands: ['B11', 'B8', 'B2'], min:0, max:3000,},
                  false,
                  null,
                  'Description text Agriculture'],
};

// TEXT ####################
var emptyline = ui.Label(
  '', textFont);
var emptylineyear = ui.Label(
  '', textFontyear);
  var emptylineexternal = ui.Label(
  '', textFontexternal);
  
// App Name
var appname = ui.Label(
  'EMSAfrica Monitor',
  titelFont);
  
// Info Button
var infobutton = ui.Label({
  value: 'About this App (GitHub Wiki)', style: githublink, targetUrl: 'https://github.com/prenner-eo/EMSAfricaMonitor/wiki'
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
  'Set years.',
  headerFontyear);
  
var yearinfo =ui.Label(
  'Earliest possible start 2019',
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
  style: {maxWidth: '65px'}});
  
var seconddatepick = ui.Textbox({
  placeholder: ui.url.get('end'),
  value: ui.url.get('end'),
  style: {maxWidth: '65px'}});

var months = ee.List.sequence(1, 12);
var years = ee.List.sequence(ui.url.get('start'),ui.url.get('end'));

// Submit Button
var submitbutton = ui.Button({
  label: 'Submit Years', style: buttonStyle
});

// INDICES
var indexhead = ui.Label(
  'Choose an index from the list.',
  headerFontindex);
// Drop Down Menu
var indexselect = ui.Select({
  items: Object.keys(indices),
  //placeholder: ui.url.get('index'),
  value: ui.url.get('index'),
  onChange: function(key){
    infoIndices.setValue(indices[key][3]);
    handleSubmit();
  }
});

// EXTERNAL DATA
var externalheadline = ui.Label({
  value: 'External Data to view:',
  style: headerFontexternal});
  
var emsdataheadline = ui.Label({
  value: 'EMSAfrica Data to view:',
  style: headerFontexternal});
// ESA World Cover
var headesaworldcover = ui.Label('Landcover Product 2020 (10m):', textFontexternal);
var buttonesaworldcover = ui.Button({
  label: 'ESA World Cover (10m)', style: buttonStyle
});
// DMC
var linkdmc = ui.Label('More information in the related publication.', linkstyleexternal,'https://koedoe.co.za/index.php/koedoe/article/view/1679/2919');
var headdmc = ui.Label('Digital Mapping Camera (DMC) Products\n(Only available for Kruger National Park, SA):', textFontexternal);

var button2 = ui.Button({
  label: 'DMC Digital Surface Model (DSM) 1m', style: buttonStyle
});
var button3 = ui.Button({
  label: 'DMC Digital Terrain Model (DTM) 1m', style: buttonStyle
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

  return monthlyImages
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

  return image.updateMask(mask)
}

// print('Sentinel-2 Filtered collection',s2Filt);

// Create Time Series Gallery View
// modified from Braaten 2021
function displayBrowseImg(col, aoiBox, aoiCircle,visParams) {
  clearImgs();
  waitMsgImgPanel.style().set('shown', true);
  galleryPanel.add(waitMsgImgPanel);
  
  print(visParams);
  
  var dates = col.aggregate_array('date');
  print(dates);
  
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

// ROI Points and AOI Circle Define by Map Click Function
// modified from Braaten 2021
function renderGraphics(coords,years,months,visParams) {
  // Get the clicked point and buffer it.
  var point = ee.Geometry.Point(coords);
  var aoiCircle = point.buffer(50);
  var aoiBox = point.buffer(500);
  
  // Clear previous point from the Map.
  map.layers().forEach(function(el) {
    map.layers().remove(el);
  });
  map.layers().forEach(function(el) {
    map.layers().remove(el);
  });
  
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
    rgbColors = rgbColors.slice(8)
    print(rgbColors)
    
    // Design Chart
    var options = { 
    title: 'The '+ indexselect.getValue()+' indicates '+ indices[indexselect.getValue()][4]+' over time', 
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
  }
  else{
  chartPanel.clear();
  chartPanel.add(ui.Label({value: 'For this index there is no chart available.',
                          style: {stretch: 'horizontal', textAlign: 'center'}}));
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
  print(COORDS);
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

// Function to add external data
// ESA World Cover 10m #############
function insertesaworldcover(){
  // Product to the Map
  var esaworldcover = ee.ImageCollection("ESA/WorldCover/v100").first();
  var vis = {bands: ['Map']};
  map.addLayer(esaworldcover, vis, 'Landcover');
  // Add Legend to Map
}

// DMC Data

// Generating Hillshade for DMC Data code snippets from
// eARTh Engine: Turn cold pixels to a colorful Terrain
// https://code.earthengine.google.com/d136f0a45cee76a89ed45384dc376793

function dmcshade (image){
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
  return SHADED_RELIEF
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

function insertdsm(){
  map.centerObject(knparea);                                    //ToDo: if Point is not in KNP center KNP else do nothing
  var dsm1mshade = dmcshade(dsm1m).clip(knparea);
  map.addLayer(dsm1mshade, null, 'Hillshade DSM 1m');
  map.addLayer(dsm1m.resample('bicubic').clip(knparea), visdmc, 'Elevation DSM 1m', null, 0.5);
  map.addLayer(SURFACE_WATER, null, 'Surface Water');
}
function insertdtm(){                                           //ToDo: if Point is not in KNP center KNP else do nothing
  map.centerObject(knparea);
  var dtm1mshade = dmcshade(dtm1m).clip(knparea);
  map.addLayer(dtm1mshade, null, 'Hillshade DSM 1m');
  map.addLayer(dtm1m.resample('bicubic').clip(knparea), visdmc, 'Elevation DSM 1m', null, 0.5);
  map.addLayer(SURFACE_WATER, null, 'Surface Water');
}

// Link Funcitons to Buttons
buttonesaworldcover.onClick(insertesaworldcover);
button2.onClick(insertdsm);
button3.onClick(insertdtm);

// #################################
// ########## UI INIT     ##########
// #################################

// Create UI Panel Head
headPanel.add(appname);
headPanel.add(infobutton);

// Create UI Panel Years
yearPanel.add(yearhead);
yearPanel.add(yearinfo);
yearPanel.add(firstdatetext);
yearPanel.add(firstdatepick);
yearPanel.add(seconddatetext);
yearPanel.add(seconddatepick);
yearPanel.add(submitbutton);
yearPanel.add(emptylineyear);

// Create UI Panel Indices
indicesPanel.add(indexhead);
indicesPanel.add(indexselect);
indicesPanel.add(infoIndices);

// Create UI Panel External Data
externaldata.add(emsdataheadline);
externaldata.add(headdmc);
externaldata.add(button2);
externaldata.add(button3);
externaldata.add(linkdmc);
externaldata.add(externalheadline);
externaldata.add(headesaworldcover);
externaldata.add(buttonesaworldcover);
externaldata.add(emptylineexternal);

// add Panels to SettingPanel
settingPanel.add(headPanel);
settingPanel.add(yearPanel);
settingPanel.add(indicesPanel);
settingPanel.add(externaldata);
settingPanel.add(sourcebutton);

map.onClick(handleMapClick);
submitbutton.onClick(handleSubmit);

map.style().set('cursor', 'crosshair');
map.setCenter(25, -27, 5);
map.add(clickmapbox);

ui.root.clear();
ui.root.add(splitPanel);

if(ui.url.get('run')) {
  CLICKED = true;
  COORDS = [ui.url.get('lon'), ui.url.get('lat')];
  visParams=indices[indexselect.getValue()][0];
  renderGraphics(COORDS,years,months,visParams);
  map.remove(clickmapbox);
}
