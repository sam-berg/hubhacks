﻿var map;
var maxZoomLevel = 9;

var MapController = {

    init: function () {
        console.log("MapController.init()");
        this.initMap();
    },

    initMap: function () {
        console.log("MapController.initMap()");

        //graphics layer definitions
        this.glStreetHighlight = new esri.layers.GraphicsLayer();
        this.glAddressHighlight = new esri.layers.GraphicsLayer();

        //geometry service
        //this.geomService = new esri.tasks.GeometryService("http://support.geonetics.com/ArcGIS2/rest/services/Geometry/GeometryServer");
        this.geomService = new esri.tasks.GeometryService("http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");//http://support.geonetics.com/ArcGIS2/rest/services/Geometry/GeometryServer");

        //symbology
        this.symStreet = new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color("blue"), 3);
        this.symAddress = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 10, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color("black"), 1));
        this.symAddress.setColor(new dojo.Color("red"));

        //address info template
        this.infoAddress = new esri.InfoTemplate("Address ${addressId}", "Address: ${fullAddress}<br>" +
            "Neighborhood: ${mailingNeighborhood}, ${zipCode}<br>" +
            "");

        //map and layers
        map = new esri.Map("mapDiv");
        var baselayer = new esri.layers.ArcGISTiledMapServiceLayer("http://maps.cityofboston.gov/ArcGIS/rest/services/SAM/maint_tool/MapServer");
        map.addLayer(baselayer);

        var ortholayer = new esri.layers.ArcGISTiledMapServiceLayer("http://hubmaps2.cityofboston.gov/ArcGIS/rest/services/image_services/ortho_2008_spf_tiled/MapServer");
        ortholayer.setVisibility(false);
        map.addLayer(ortholayer);

        //graphics layers
        map.addLayer(this.glStreetHighlight);
        map.addLayer(this.glAddressHighlight);

        dojo.connect(map, "onClick", this.handleMapClick);

        dojo.connect(this.glAddressHighlight, "onClick", this.handleAddressPointClick);

        //map dijits
        /*
        var home = new esri.dijit.HomeButton({
            map: map
        }, "HomeButton");
        home.startup();

        var ortho = new esri.dijit.OrthoButton({
            mapService: ortholayer,
            serviceVisible : false
        }, "OrthoButton");
        ortho.startup();
        */
        map.resize();
    },

  //SB
    doBIDSearch: function (buildingID) {

      alert("todo, search for address for buildingID: " + buildingID);//todo


    },
    doSAMSearchSpatial: function (geom) {

      var queryTask = new esri.tasks.QueryTask("http://maps.cityofboston.gov/ArcGIS/rest/services/SAM/LIVE_SAM_ADDRESS/MapServer/0");

      //initialize query
      query = new esri.tasks.Query();
      query.returnGeometry = true;
      query.outFields = ["*"];
      query.where = "0=0";
      query.geometry = geom;

      queryTask.on("complete", function (fs) {
        alert("found " + fs.featureSet.features.length.toString() + " results!");
      })
      queryTask.execute(query);


    },
    //map click
    handleMapClick: function (evt) {


      //search for building at location
      var queryTask = new esri.tasks.QueryTask("http://maps.cityofboston.gov/ArcGIS/rest/services/SAM/maint_tool/MapServer/11");

      //initialize query
      query = new esri.tasks.Query();
      query.returnGeometry = true;
      query.outFields = ["BID"];
      query.where = "0=0";
      query.geometry = evt.mapPoint;

      queryTask.on("complete", function (fs) {
        var resultFeatures = fs.featureSet.features;
        if (resultFeatures != null && resultFeatures.length > 0) {
          //if found building search for SAM addresses

          var b = resultFeatures[0];
          var buildingID = b.attributes.BID;

          MapController.doBIDSearch(buildingID);
          return;
        }

      });

      queryTask.execute(query);

      //region buffersearch

      //if no building, do buffer of input point
      var geometry = evt.mapPoint;

      var symbol = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_SQUARE, 10, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 0, 0]), 1), new dojo.Color([0, 255, 0, 0.25]));
      var graphic = new esri.Graphic(geometry, symbol);

      map.graphics.add(graphic);

      //setup the buffer parameters
      var params = new esri.tasks.BufferParameters();
      params.distances = [100];//todo, config

      //params.bufferSpatialReference = new esri.SpatialReference({ wkid: 102100 });
      params.outSpatialReference = map.spatialReference;
      params.unit = esri.tasks.GeometryService.UNIT_FOOT;

      params.geometries = [geometry];
      MapController.geomService.buffer(params, function (res) {
        //search SAM database within buffer


        MapController.doSAMSearchSpatial(res[0]);

      });




      //end region buffer search
    },


    handleAddressPointClick: function (clickedPoint) {
        if (clickedPoint && clickedPoint.graphic && clickedPoint.graphic.attributes) {
            ListController.highlightAddress(clickedPoint.graphic.attributes);
        }
    },

    //zoom functions
    zoomAndCenterToXY: function (xCoord, yCoord, bZoomIn) {
        if (xCoord == 0 && yCoord == 0) {
            return;
        }

        var mp = new esri.geometry.Point(xCoord, yCoord, map.spatialReference);

        if (bZoomIn) {
            map.centerAndZoom(mp, maxZoomLevel);
        }
        else {
            map.centerAt(mp);
        }
    },


    zoomAndCenterToAddress: function (address, bZoomIn, bDrawOnMap, bClearMap) {
        MapController.zoomAndCenterToXY(address.xCoord, address.yCoord, bZoomIn);

        //draw
        if (bClearMap) {
            MapController.clearMap();
        }
        if (bDrawOnMap) {
            //make a new feature
            var pt = new esri.geometry.Point(address.xCoord, address.yCoord);
            var g = new esri.Graphic(pt, MapController.symAddress, address, this.infoAddress);
            MapController.drawPoint(g);
            map.infoWindow.setTitle(g.getTitle());
            map.infoWindow.setContent(g.getContent());
            map.infoWindow.show(pt);
        }
    },


    zoomAndCenterToStreet: function (street, bZoomIn, bDrawOnMap, bClearMap) {
        //query the street to get to the geometry
        var q = new esri.tasks.Query();
        var qt = new esri.tasks.QueryTask("http://hubmaps2.cityofboston.gov/ArcGIS/rest/services/SAM/maint_tool/MapServer/7");

        q.returnGeometry = true;
        q.where = "SAM_STREET = {0}".replace("{0}", street.streetId);

        qt.execute(q,
            function (results) {
                if (results != null && results.features != null && results.features.length <= 0) {
                    return;
                }

                var firstStreetFeature = results.features[0];

                //center / zoom
                if (bZoomIn) {
                    map.setExtent(firstStreetFeature.geometry.getExtent());
                }

                //draw
                MapController.drawStreetPolyline(firstStreetFeature, bDrawOnMap, bClearMap);
            },
            MapController.handleStreetQueryError);
    },


    //draw functions
    drawStreetPolyline: function (feature, bDrawOnMap, bClearMap) {
        if (bDrawOnMap) {

            if (bClearMap) {
                MapController.glStreetHighlight.clear();
            }

            feature.setSymbol(MapController.symStreet);
            MapController.glStreetHighlight.add(feature);
        }
    },


    setResults: function (addresses) {
        MapController.clearMap();
        $.each(addresses, function (index, value) {
            MapController.drawAddress(value);
        });
    },


    clearMap: function () {
        MapController.glAddressHighlight.clear();
        MapController.glStreetHighlight.clear();
        map.infoWindow.hide();
    },


    drawAddress: function (address) {
        var pt = new esri.geometry.Point(address.xCoord, address.yCoord);
        var g = new esri.Graphic(pt, MapController.symAddress, address, this.infoAddress);

        MapController.drawPoint(g);
    },


    highlightAddress: function (addressObject) {
        var pt = new esri.geometry.Point(addressObject.xCoord, addressObject.yCoord);
        var g = new esri.Graphic(pt, MapController.symAddress, address, this.infoAddress);
        MapController.drawPoint(g);
        map.infoWindow.setTitle(g.getTitle());
        map.infoWindow.setContent(g.getContent());
        map.infoWindow.show(pt);
    },


    drawPoint: function (feature) {
        feature.setSymbol(MapController.symAddress);
        MapController.glAddressHighlight.add(feature);
    },


    //query functions
    handleStreetQueryError: function (err) {
        console.log(err);
    }

};
