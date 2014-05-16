describe("DataTable Plugin", function() {

  var app;
  var baseExports;
  var collection;

  beforeEach(function() {
    Backdraft.app.destroyAll();
    app = Backdraft.app("myapp", {
      plugins : [ "DataTable" ]
    });
    app.model("M", {});
    app.collection("Col", {
      model : app.Models.M
    });
    collection = new app.Collections.Col();
    baseExports = Backdraft.plugin("Base");
  });

  describe("factories", function() {

    it("should expose #dataTable and #dataTable.row", function() {
      app.view.dataTable.row("abc", { columns : [] });
      app.view.dataTable("def", {
        rowClassName : "abc"
      });
      expect(new app.Views.abc()).toEqual(jasmine.any(baseExports.View));
      expect(new app.Views.def({ collection : collection })).toEqual(jasmine.any(baseExports.View));
    });

  });

  describe("renderers", function() {

    var table;

    describe("attr based", function() {

      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns : [
            { attr : "name", title : "Name" }
          ]
        });
        app.view.dataTable("T", {
          rowClassName : "R"
        });

        table = new app.Views.T({ collection : collection });
        table.render();
      });

      it("should not insert them as html", function() {
        collection.add({ name : "<b>hihi</b>" });
        expect(table.$("tbody tr td:first").html()).toEqual("&lt;b&gt;hihi&lt;/b&gt;");
      });

    });

    describe("bulk", function() {

      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns : [
            { bulk : "true" }
          ]
        });
        app.view.dataTable("T", {
          rowClassName : "R"
        });

        table = new app.Views.T({ collection : collection });
        table.render();
      });

      it("should insert a checkbox", function() {
        collection.add({});
        expect(table.$("tbody tr td:first :checkbox").length).toEqual(1);
      });


    });

    describe("user defined", function() {

      beforeEach(function() {
        app.view.dataTable.row("R", {
          columns : [
            { title : "Name" },
            { title : "Age", attr : "age_value" }
          ],
          renderers : {
            // pure html, not based on model
            "Name" : function(node, config) {
              node.html('<a href="#">I AM LINK</a>');
            },
            "Age" : function(node, config) {
              node.addClass("age").text(this.model.get(config.attr));
            }
          }
        });
        app.view.dataTable("T", {
          rowClassName : "R"
        });

        table = new app.Views.T({ collection : collection });
        table.render();
      });

      it("should insert a checkbox", function() {
        collection.add({ age_value : 30 });
        var cells = table.$("tbody td");
        expect(cells.eq(0).html()).toEqual('<a href="#">I AM LINK</a>');
        expect(cells.eq(1).hasClass("age")).toEqual(true);
        expect(cells.eq(1).text()).toEqual("30");
      });

    });

  });

  describe("columns", function(){
    it("can only be provided as an array or a function that returns an array", function(){
      var passingArray = function() {
        app.view.dataTable.row("ArrayCol", {
          columns : [
            { bulk : "true" }
          ]
        });
        app.view.dataTable("TableCol", {
          rowClassName : "ArrayCol"
        });

        table = new app.Views.TableCol({ collection : collection });
        table.render();
      };

      var passingFn = function() {
        app.view.dataTable.row("ArrayCol", {
          columns : function() {
            return [
              { bulk : "true" }
            ];
          }
        });
        app.view.dataTable("TableCol", {
          rowClassName : "ArrayCol"
        });

        table = new app.Views.TableCol({ collection : collection });
        table.render();
      };

      var failing = function() {
        app.view.dataTable.row("ArrayCol", {
          columns : function() {
            return { bulk : "true" };
          }
        });
        app.view.dataTable("TableCol", {
          rowClassName : "ArrayCol"
        });

        table = new app.Views.TableCol({ collection : collection });
        table.render();
      };

      expect(passingArray).not.toThrow();
      expect(passingFn).not.toThrow();
      expect(failing).toThrow();
    });
  });

  describe("Local data store", function() {

    describe("rendering", function() {

      describe("collection changes", function() {

        var table;

        beforeEach(function() {
          app.view.dataTable.row("R", {
            columns : [
              { attr : "name", title : "Name" }
            ]
          });
          app.view.dataTable("T", {
            rowClassName : "R"
          });
          table = new app.Views.T({ collection : collection });
          table.render();
        });

        describe("collection is reset", function() {

          beforeEach(function() {
            collection.reset([ { name : "Bob" }, { name : "Joe" } ]);
          });

          it("should render a view for every single model in the collection", function() {
            var rows = table.$("tbody tr");
            expect(rows.length).toEqual(2);
            expect(rows.eq(0).find("td").html()).toEqual("Joe");
            expect(rows.eq(1).find("td").html()).toEqual("Bob");
          });

          it("should have children views for every model", function() {
            expect(_.size(table.children)).toEqual(2);
          });

          it("should have cache populated for every model", function() {
            expect(table.cache.size()).toEqual(2);
          });

          it("should remove children when the collection is reset to nothing", function() {
            collection.reset();
            expect(_.size(table.children)).toEqual(0);
          });

          it("should have cache cleared when the collection is reset to nothing", function() {
            collection.reset();
            expect(table.cache.size()).toEqual(0);
          });

        });

        describe("collection is added to", function() {

          beforeEach(function() {
            collection.add({ name : "Bob" });
          });

          it("should add a view for the model added", function() {
            var rows = table.$("tbody tr");
            expect(rows.length).toEqual(1);
            expect(rows.eq(0).find("td").html()).toEqual("Bob");
          });

          it("should register a child view for the model added", function() {
            expect(_.size(table.children)).toEqual(1);
          });

          it("should populate the cache for the model added", function() {
            expect(table.cache.size()).toEqual(1);
          });

        });

        describe("collection is removed from", function() {

          beforeEach(function() {
            collection.reset([ { name : "Bob"}, { name : "Joe"} ]);
            collection.remove(collection.models[0]);
          });

          it("should remove a view for the model removed", function() {
            var rows = table.$("tbody tr");
            expect(rows.length).toEqual(1);
            expect(rows.eq(0).find("td").html()).toEqual("Joe");
          });

          it("should remove a child view for the model removed", function() {
            expect(_.size(table.children)).toEqual(1);
          });

          it("should purge the cache fo the removed model", function() {
            expect(table.cache.size()).toEqual(1);
          });

        });

      });

    });

    describe("pagination", function() {

      it("should paginate by default", function() {
        app.view.dataTable.row("R", {
          columns : [
            { attr : "name", title : "Name" }
          ]
        });
        app.view.dataTable("T", {
          rowClassName : "R"
        });

        table = new app.Views.T({ collection : collection });
        table.render();

        expect(table.$(".dataTables_paginate").length).toEqual(1);
      });

      it("should allow pagination to be disabled", function() {
        app.view.dataTable.row("R", {
          columns : [
            { attr : "name", title : "Name" }
          ]
        });
        app.view.dataTable("T", {
          rowClassName : "R",
          paginate : false
        });

        table = new app.Views.T({ collection : collection });
        table.render();

        expect(table.$(".dataTables_paginate").length).toEqual(0);
      });

    });

    describe("bulk selection", function() {

      var data;

      beforeEach(function() {
        data = [];
        for (var iter = 0; iter < 100; ++iter) {
          data.push({ id : iter +1, name : "hi " + iter });
        }
      });

      describe("without pagination", function() {

        beforeEach(function() {
          app.view.dataTable.row("R", {
            columns : [
              { bulk : true },
              { attr : "name", title : "Name" }
            ]
          });
          app.view.dataTable("T", {
            rowClassName : "R",
            paginate : false
          });
          collection.reset(data);
        });

        it("should not unselect models that are filtered out", function() {
          table = new app.Views.T({ collection : collection });
          table.render();

          expect(table.selectedModels().length).toEqual(0);
          table.selectAllVisible(true)
          expect(table.selectedModels().length).toEqual(data.length);

          collection.add({ name : "monkey "});
          collection.add({ name : "monkey and more "});

          table.filter("monkey");
          table.selectAllVisible(true);
          expect(table.selectedModels().length).toEqual(data.length + 2);
        });

        it("should not allow selectAllMatching to be called", function() {
          table = new app.Views.T({ collection : collection });
          table.render();

          expect(function() {
            table.selectAllMatching();
          }).toThrowError("#selectAllMatching can only be used with paginated tables");
        });

        it("should allow a list of pre-selected model ids to be provided and select the correct rows", function() {
          var selectedIds = [ 1, 2, 3, 10, 11, 90, 76, 45 ];
          table = new app.Views.T({ collection : collection, selectedIds : selectedIds });
          table.render();
          expect(_.pluck(table.selectedModels(), "id")).toEqual(selectedIds);
        });

        it("should not throw exceptions when provided pre-selected model ids that don't exist", function() {
          var selectedIds = [ 1, 2, 3, -1 ];
          expect(function() {
            table = new app.Views.T({ collection : collection, selectedIds : selectedIds });
            table.render();
          }).not.toThrow();

          expect(table.selectedModels().length).toEqual(3);
        });
      });

      describe("with pagination", function() {

        beforeEach(function() {
          app.view.dataTable.row("R", {
            columns : [
              { bulk : true },
              { attr : "name", title : "Name" }
            ]
          });
          app.view.dataTable("T", {
            rowClassName : "R",
            paginate : true
          });
          collection.reset(data);
        });

        it("should select models that are not filtered out from the current page only", function() {
          table = new app.Views.T({ collection : collection });
          table.render();
          expect(table.selectedModels().length).toEqual(0);
          table.selectAllVisible(true);

          var selectedModels = _.map(table.selectedModels(), function(m) {
            return m.toJSON();
          });

          var selectedModelsExpected = _.map(collection.slice(0,10), function(m) {
            return m.toJSON();
          });

          expect(selectedModelsExpected).toEqual(selectedModels);
        });

        it("should uncheck the header bulk checkbox when a page transitions and the next page doesn't have all rows already selected", function(done) {
          table = new app.Views.T({ collection : collection });
          table.render();
          table.selectAllVisible(true);

          // we need to test this using an async strategy because the checkbox is toggled async as well
          table.dataTable.on("page", function() {
            _.defer(function() {
              expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
              done()
            });
          });

          table.changePage("next");
        });

        it("should check the header bulk checkbox when a page transitions and the next page has all rows already selected", function() {
          table = new app.Views.T({ collection : collection });
          table.render();
          table.selectAllVisible(true);
          table.changePage("next");
          table.selectAllVisible(true);

          // we need to test this using an async strategy because the checkbox is toggled async as well
          table.dataTable.on("page", function() {
            _.defer(function() {
              table.changePage("previous");
              expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(true);
            });
          });
        });

        describe("selectedIds", function() {

          it("should allow a list of model ids to be provided and select the correct models", function() {
            var selectedIds = [ 1, 2, 3, 10, 11, 90, 76, 45 ];
            table = new app.Views.T({ collection : collection, selectedIds : selectedIds });
            table.render();
            expect(_.pluck(table.selectedModels(), "id")).toEqual(selectedIds);
          });

          it("should make the correct rows appear selected as some my not be rendered initially due to deferred rendering", function() {
            var selectedIds = [ 1, 2, 3, 10, 11, 90, 76, 45, 72, 97, 33, 5, 13 ];
            table = new app.Views.T({ collection : collection, selectedIds : selectedIds });
            table.render();
            table.$(".dataTables_length select").val(100).change();
            expect(table.$("td.bulk :checkbox:checked").length).toEqual(selectedIds.length);

          });

        });

      });

      describe("regardless of pagination", function() {

        beforeEach(function() {
          app.view.dataTable.row("R", {
            columns : [
              { bulk : true },
              { attr : "name", title : "Name" }
            ]
          });
          app.view.dataTable("T", {
            rowClassName : "R",
            paginate : false
          });
          collection.reset(data);
        });

        it("should check/uncheck the header bulk checkbox when #selectAllVisible is called", function() {
          table = new app.Views.T({ collection : collection });
          table.render();

          expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
          table.selectAllVisible(true);
          expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(true);
          table.selectAllVisible(false);
          expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
        });

        it("should uncheck the header bulk checkbox when a row's checkbox is unchecked", function() {
          table = new app.Views.T({ collection : collection });
          // need to append to body in order to do clicks on checkboxes
          $("body").append(table.render().$el);

          table.selectAllVisible(true)

          // uncheck a single row checkbox
          table.$("td.bulk :checkbox:first").click();
          expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
        });

        it("should uncheck the header bulk checkbox when a filter is applied and the result set doesn't have all rows already selected", function(done) {
          table = new app.Views.T({ collection : collection });
          table.render();
          table.filter("89");
          table.selectAllVisible(true);

          expect(table.selectedModels().length).toEqual(1);

          // we need to test this using an async strategy because the checkbox is toggled async as well
          table.dataTable.on("filter", function() {
            _.defer(function() {
              expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
              done()
            });
          });

          // relax the filter and verify that the checkbox is not checked
          table.filter("");
        });

        it("should check the header bulk checkbox when a filter is applied and the result set has all rows already selected", function(done) {
          table = new app.Views.T({ collection : collection });
          table.render();
          table.filter("9");
          table.selectAllVisible(true);

          // there are 19 rows with the number "9" in them
          expect(table.selectedModels().length).toEqual(19);

          // we need to test this using an async strategy because the checkbox is toggled async as well
          table.dataTable.on("filter", function() {
            _.defer(function() {
              expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(true);
              done()
            });
          });

          // restrict the filter and verify that the checkbox is checked
          table.filter("89");
        });

        it("should uncheck the header bulk checkbox when a filter is applied and the result set is empty", function(done) {
          table = new app.Views.T({ collection : collection });
          table.render();

          // we need to test this using an async strategy because the checkbox is toggled async as well
          table.dataTable.on("filter", function() {
            _.defer(function() {
              expect(table.$("th.bulk :checkbox").prop("checked")).toEqual(false);
              done()
            });
          });

          // filter by something that doesn't exist and verify that the checkbox is not checked
          table.filter("not gonna find me");
        });

        it("should toggle the 'backdraft-selected' class on the row when a row's checkbox is toggled", function() {
          table = new app.Views.T({ collection : collection });
          // need to append to body in order to do clicks on checkboxes
          $("body").append(table.render().$el);

          expect(table.$(".backdraft-selected").length).toEqual(0);
          table.selectAllVisible(true);
          expect(table.$(".backdraft-selected").length).toEqual(data.length);

          // uncheck a single row checkbox
          table.$("td.bulk :checkbox:first").click();
          expect(table.$(".backdraft-selected").length).toEqual(data.length - 1);
        });

      });

    });

  });

});



