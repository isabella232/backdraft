var DataTableFilter = (function(options) {
  var Base = Backdraft.plugin("Base");

  var DEFAULT_JST_DELIMS = {
    evaluate: /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape: /<%-([\s\S]+?)%>/g
  };

  var DataTableFilterMenu = Base.View.extend({
    filterMenuClass: "",
    menuTemplate: _.template(''), // to be overridden by subclasses

    initialize: function (options) {
      this.filter = options.column.filter;
      this.attr = options.column.attr;
      this.title = options.column.title;
      this.parentView = options.parentView;
    },

    events: {
      "click input": "_onInputClick",
      "change input": "_onInputChange"
    },

    render: function () {
      this.beforeRender();

      this.$el.html(this.menuTemplate({
        filter: this.filter,
        attr: this.attr,
        title: this.title,
        parentView: this.parentView
      }));

      this.afterRender();
      return this;
    },

    beforeRender: function () {
      // to be optionally implemented by subclasses
    },

    afterRender: function () {
      // to be optionally implemented by subclasses
    },

    _onInputClick: function (event) {
      event.target.focus();
      event.stopImmediatePropagation();
    },

    _onInputChange: function (event) {
      // to be implemented by subclasses
    }
  });

  var StringFilterMenu = DataTableFilterMenu.extend({
    filterMenuClass: "filterMenu-string",

    menuTemplate: _.template('\
        <div class="filter-text">Show:</div>\
        <div class="icon-addon addon-sm">\
          <input class="filter-string form-control input-sm" id="value" type="text" name="filter-string" />\
          <label for="filter-string" class="glyphicon glyphicon-search"></label>\
        </div>\
      ', null, DEFAULT_JST_DELIMS),

    _onInputChange: function (event) {
      var filterInput = event.target;
      if (filterInput.value === "") {
        this.filter.value = null;
        this.parentView._toggleIcon(false);
      } else {
        this.filter.value = filterInput.value;
        this.parentView._toggleIcon(true);
      }
    }
  });

  var NumericFilterMenu = DataTableFilterMenu.extend({
    filterMenuClass: "filterMenu-numeric",

    menuTemplate: _.template('\
      <div class="filter-text">Show items with value that:</div>\
      <select class="filter-type form-control" data-filter-id="first-filter">\
        <option selected value="gt">is greater than</option> \
        <option value="lt">is less than</option> \
        <option value="eq">is equal to</option> \
      </select> \
      <input id="first-filter" class="filter-value form-control" type="text" data-filter-type="gt"  /> \
      <div class="filter-text">and</div> \
      <select class="filter-type form-control" data-filter-id="second-filter">\
        <option value="gt">is greater than</option> \
        <option selected value="lt">is less than</option> \
        <option value="eq">is equal to</option> \
      </select> \
      <input id="second-filter" class="filter-value form-control" type="text" data-filter-type="lt" /> \
    ', null, DEFAULT_JST_DELIMS),

    _onInputChange: function (event) {
      event.stopImmediatePropagation();
      var filterType = event.target.getAttribute('data-filter-type'),
          filterValue = event.target.value;
      if (filterValue === "") {
        this.filter[filterType] = null;
        this.parentView._toggleIcon(false);
      } else {
        this.filter[filterType] = filterValue;
        this.parentView._toggleIcon(true);
      }
    },

    afterRender: function() {
      this.$('.filter-type').bind('change', function(event) {
        var filterElementId = event.target.getAttribute('data-filter-id'),
          filterType = event.target.value;
        this.$('#'+filterElementId).attr('data-filter-type', filterType);
      }.bind(this));
    }
  });

  var ListFilterMenu = DataTableFilterMenu.extend({
    filterMenuClass: "filterMenu-list",

    menuTemplate: _.template('\
        <div class="filter-text">Show:</div>\
        <a class="select-all" href="javascript:;">Select all</a>\
        <ul>\
          <% _.each(filter.options, function(element, index) { %>\
            <li>\
              <label>\
                <input class="list list-item-input" id="value" type="checkbox" name="<%= attr %>" value="<%= element %>" /> \
                <%= element %>\
              </label>\
            </li>\
          <% }) %>\
        </ul>\
      ', null, DEFAULT_JST_DELIMS),

    afterRender: function () {
      var listClass;

      if (this.filter.options.length > 30) {
        listClass = "triple";
      } else if (this.filter.options.length > 15) {
        listClass = "double";
      } else {
        listClass = "single";
      }

      this.$("ul").addClass(listClass);
      this.$(".select-all").click(this._selectAll.bind(this));
    },

    _selectAll: function(event) {
      this.$('li input').each(function(i, el) {
        this.$(el).click();
      }.bind(this));
    },

    _onInputChange: function (event) {
      var filterInput = event.target;
      if (filterInput.checked) {
        this.filter.value = this.filter.value || [];
        this.filter.value.push(filterInput.value);
        this.parentView._toggleIcon(true);
      }
      // remove filter from column manager if it is defined
      else if (this.filter.value) {
        var index = this.filter.value.indexOf(filterInput.value);
        if (index > -1) {
          this.filter.value.splice(index, 1);
        }
        if (this.filter.value.length === 0) {
          this.filter.value = null;
          this.parentView._toggleIcon(false);
        }
      }
    }
  });

  var DataTableFilter = Base.View.extend({
    template: _.template('\
        <div class="toggle-filter-button" data-toggle="dropdown">\
          <span class="<%= filterButtonClass %>"></span>\
        </div>\
        <div class="filterMenu <%= filterMenuClass %> dropdown-menu">\
          <button class="btn btn-sm btn-filter" name="button" type="submit" title="">Apply</button>\
          <button class="btn btn-primary btn-sm btn-clear pull-right" name="button" type="submit" title="">Clear</button>\
        </div>\
      ', null, DEFAULT_JST_DELIMS),

    events: {
      "click .toggle-filter-button": "_onToggleClick",
      "click .btn-filter": "_onFilterClick",
      "click .btn-clear": "_onClearClick"
    },

    initialize: function (options) {
      this.filter = options.column.filter;
      this.attr = options.column.attr;
      this.title = options.column.title;
      this.table = options.table;
      this.head = options.head;
      this.filterButtonClass = "filterInactive";

      // decide which filter view based on type, here
      var filterMenu = null;
      switch (this.filter.type) {
        case 'string':
          filterMenu = new StringFilterMenu({column: options.column, parentView: this});
          break;
        case 'numeric':
          filterMenu = new NumericFilterMenu({column: options.column, parentView: this});
          break;
        case 'list':
          filterMenu = new ListFilterMenu({column: options.column, parentView: this});
          break;
      }

      // add as a child (backdraft thing just to keep bookkeeping on subviews)
      this.child("filter-menu", filterMenu);
    },

    render: function () {
      this.$el.html(this.template({
        filterButtonClass: this.filterButtonClass,
        filterMenuClass: this.child("filter-menu").filterMenuClass
      }));

      $(".filterMenu", this.$el).prepend(this.child("filter-menu").render().$el);
      return this;
    },

    _toggleIcon: function (enabled) {
      var icon = $(".toggle-filter-button>span", this.$el);
      icon.removeClass("filterActive");
      icon.removeClass("filterInactive");
      if (enabled) {
        icon.addClass("filterActive");
      } else {
        icon.addClass("filterInactive");
      }
    },

    _onToggleClick: function (event) {
      var table = this.table;
      event.stopImmediatePropagation();
      var currentFilterMenu = $('.filterMenu', this.$el);
      if ((table.activeFilterMenu) && (table.activeFilterMenu.is(currentFilterMenu))) {
        table.activeFilterMenu.slideUp(100);
        table.activeFilterMenu = null;
      } else if (table.activeFilterMenu) {
        table.activeFilterMenu.slideUp(100, function () {
          table.activeFilterMenu = currentFilterMenu;
          table.activeFilterMenu.slideDown(200);
        });
      } else {
        table.activeFilterMenu = currentFilterMenu;
        table.activeFilterMenu.slideDown(200);
      }
    },

    _onFilterClick: function () {
      $("input[type=text]", this.head).trigger("change");
      this.table.dataTable._fnAjaxUpdate();
    },

    _onClearClick: function () {
      $("input[type=text]", this.head).val("");
      $("input[type=checkbox]", this.head).attr("checked", false);
      $("input", this.head).trigger("change");
      this.table.dataTable._fnAjaxUpdate();
    }
  });

  return new DataTableFilter(options);
});
