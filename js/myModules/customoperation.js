var customOperation;

define([
  "dojo/_base/declare", "esri/OperationBase", "esri/toolbars/navigation"
  ], function(declare, OperationBase, Navigation) {
      var customOp = {};
    customOp.Add = declare(OperationBase, {
      label: "Add Graphic",
      constructor: function ( /*graphicsLayer, addedGraphic*/ params) {
        params = params || {};
        if (!params.graphicsLayer) {
          console.error("graphicsLayer is not provided");
          return;
        }
        this.graphicsLayer = params.graphicsLayer;

        if (!params.addedGraphic) {
          console.error("no graphics provided");
          return;
        }
        this._addedGraphic = params.addedGraphic;
      },

      performUndo: function () {
          this.graphicsLayer.remove(this._addedGraphic);
          SketchController.routeParams.stops.features.pop();
          SketchController.recalculateRoute();
      },

      performRedo: function () {
        this.graphicsLayer.add(this._addedGraphic);
        SketchController.routeParams.stops.features.push(this._addedGraphic);
        SketchController.recalculateRoute();
      }
  });
    customOperation = customOp;
  return customOp;
});
