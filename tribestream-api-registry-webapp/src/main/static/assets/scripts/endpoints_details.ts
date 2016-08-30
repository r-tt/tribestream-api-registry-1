///<reference path="../../bower_components/DefinitelyTyped/angularjs/angular.d.ts"/>

angular.module('tribe-endpoints-details', [
    'website-services',
    'website-services-endpoints'
])

    .directive('appEndpointsDetailsHeader', ['$window', '$timeout', '$filter', function ($window, $timeout, $filter) {
        return {
            restrict: 'A',
            templateUrl: 'app/templates/app_endpoints_details_header.html',
            scope: true,
            controller: ['$scope', '$timeout', function ($scope, $timeout) {
                $scope.$watch('application', function () {
                    // Compute endpoint URL
                    if ($scope.application && $scope.application.swagger && $scope.application.swagger.host && $scope.application.swagger.basePath) {
                        $timeout(function () {
                            $scope.$apply(function () {
                                // TODO: Reflect changes back to scheme into model
                                if ($scope.endpoint.operation.schemes) {
                                    $scope.endpointProtocol = $scope.endpoint.operation.schemes.indexOf('https') >= 0 ? 'https' : 'http';
                                } else if ($scope.application && $scope.application.swagger && $scope.application.swagger.schemes) {
                                    $scope.endpointProtocol = $scope.application.swagger.schemes.indexOf('https') >= 0 ? 'https' : 'http';
                                }
                                $scope.resourceUrl = $scope.application.swagger.host + $scope.application.swagger.basePath + $scope.endpoint.path.substring(1);
                            });
                        });
                    }
                });
            }]
        };
    }])

    .factory('tribeEndpointDetailsTocService', [
        function () {
            var data = {
                selectedAnchor: null,
                anchors: []
            };
            return {
                getData: function () {
                    return data;
                },
                setAnchor: function (title, isSubmenu, el) {
                    data.anchors.push({
                        title: title,
                        submenu: isSubmenu,
                        el: el
                    });
                },
                clearAnchors: function () {
                    data.anchors = [];
                }
            };
        }
    ])

    .directive('appEndpointsDetailsToc', ['tribeEndpointDetailsTocService', '$window', function (srv, $window) {
        return {
            restrict: 'A',
            templateUrl: 'app/templates/app_endpoints_details_toc.html',
            scope: {},
            controller: ['tribeEndpointDetailsTocService', '$scope', '$document', function (srv, $scope, $document) {
                $scope.anchors = srv.getData().anchors;
                $scope.getIndex = function (anchor) {
                    var tags = $document.find('article.app-ep-details-body *[app-endpoints-details-toc-anchor]')
                    return tags.index(anchor.el);
                };
                this.clearAnchors = function () {
                    srv.clearAnchors();
                };
            }],
            link: function (scope, el, attrs, controller) {
                el.find('div.collapse-icon').on('click', function () {
                    el.toggleClass('collapsed');
                });
                el.find('li[data-app-endpoints-details-toc-item]').on('click', function () {
                    el.removeClass('collapsed');
                });
                scope.$on('$destroy', function () {
                    controller.clearAnchors();
                });
            }
        };
    }])

    .directive('appEndpointsDetailsTocItem', ['$timeout', '$window', function ($timeout, $window) {
        return {
            restrict: 'A',
            scope: {
                anchor: '=appEndpointsDetailsTocItem'
            },
            templateUrl: 'app/templates/app_endpoints_details_toc_item.html',
            controller: ['$scope', 'tribeEndpointDetailsTocService', function ($scope, srv) {
                $scope.tocData = srv.getData();
                this.selectMe = function () {
                    $timeout(function () {
                        $scope.$apply(function () {
                            $scope.tocData.selectedAnchor = $scope.anchor;
                        });
                    });
                };
            }],
            link: function (scope, el, attrs, controller) {
                el.on('click', function () {
                    controller.selectMe();
                    var winEl = angular.element('div[data-app-endpoints-details] > div');
                    var calculateScroll = function () {
                        var target = scope.anchor.el;
                        var elOffset = target.offset().top;
                        var elHeight = target.height();
                        var windowHeight = $(window).height();
                        if (elHeight < windowHeight) {
                            return elOffset - ((windowHeight / 2) - (elHeight / 2));
                        }
                        else {
                            return elOffset;
                        }
                    };
                    winEl.animate({
                        scrollTop: calculateScroll()
                    }, function () {
                        scope.anchor.el.focus();
                        if (scope.anchor.el.is(':focus')) {
                            return;
                        }
                        scope.anchor.el.find('*').each(function (kidindex, rawKid) {
                            var kid = angular.element(rawKid);
                            kid.focus();
                            if (kid.is(':focus')) {
                                return false;
                            }
                        });
                    })
                });
                scope.$watch('tocData.selectedAnchor', function () {
                    var selected = scope.$eval('tocData.selectedAnchor');
                    if (selected && selected === scope.anchor) {
                        el.find('h4').addClass('selected');
                    } else {
                        el.find('h4').removeClass('selected');
                    }
                });
            }
        };
    }])

    .directive('appEndpointsDetailsTocAnchor', ['$timeout', function ($timeout) {
        return {
            restrict: 'A',
            scope: {
                title: '@appEndpointsDetailsTocAnchor',
                submenu: '@'
            },
            controller: ['tribeEndpointDetailsTocService', '$scope', function (srv, $scope) {
                $scope.data = srv.getData();
                this.registerAnchor = function (el) {
                    srv.setAnchor($scope.title, $scope.submenu, el);
                };
                this.setSelectedAnchor = function (el) {
                    $timeout(function () {
                        $scope.$apply(function () {
                            var anchors = $scope.data.anchors;
                            $scope.data.selectedAnchor = anchors.find(function (item) {
                                return item.el === el;
                            });
                        });
                    });
                };
            }],
            link: function (scope, el, attrs, controller) {
                $timeout(function () {
                    controller.registerAnchor(el);
                    var callback = function () {
                        controller.setSelectedAnchor(el);
                    };
                    el.find('*').on('focus', callback);
                    el.find('*').on('click', callback);
                });
            }
        };
    }])

    .directive('appEndpointsDetailsParameters', [function () {
        return {
            restrict: 'A',
            templateUrl: 'app/templates/app_endpoints_details_parameters.html',
            scope: true,
            controller: ['$scope', '$timeout', function ($scope, $timeout) {
                $scope.$watch('endpoint.uri.path', function () {
                    var path = $scope.$eval('endpoint.uri.path');
                    if (!path) {
                        return;
                    }
                    var params = path.match(/:[a-zA-Z0-9_]+/g);
                    if (params) {
                        params = _.map(params, function (value) {
                            return value.substring(1);
                        });
                    }
                    if (!params) {
                        params = [];
                    }
                    $timeout(function () {
                        $scope.$apply(function () {
                            $scope.pathParams = params;
                        });
                    });
                });
                $scope.$watch('endpoint.params', function () {
                    var params = $scope.$eval('endpoint.params');
                    if (!params) {
                        return;
                    }
                    $timeout(function () {
                        $scope.$apply(function () {
                            _.each(params, function (p) {
                                if (!p.sampleValues) {
                                    p.sampleValues = [];
                                }
                            });
                            $scope.params = params;
                        });
                    });
                });
                $scope.removeParam = function (p) {
                    $timeout(function () {
                        $scope.$apply(function () {
                            $scope.endpoint.params = _.without($scope.endpoint.params, p);
                        });
                    });
                };
                $scope.addParam = function () {
                    var params = $scope.$eval('endpoint.params');
                    if (!params) {
                        params = [];
                    }
                    $timeout(function () {
                        $scope.$apply(function () {
                            params.unshift({
                                type: 'string',
                                style: 'query',
                                sampleValues: [],
                                required: false
                            });
                            $scope.params = params;
                        });
                    });
                };
            }]
        };
    }])

    .directive('appEndpointsDetailsResourceInformation', [function () {
        return {
            restrict: 'A',
            templateUrl: 'app/templates/app_endpoints_details_resource_information.html',
            scope: true,
            controller: ['$scope', '$timeout', function ($scope, $timeout) {
                $scope.requestFormatsOptions = [
                    'text/plain', 'application/json', 'application/xml'
                ];
                $scope.responseFormatsOptions = [
                    'text/plain', 'application/json', 'application/xml'
                ];
                $scope.statusOptions = ['PROPOSAL', 'STUB', 'DRAFT', 'TEST', 'VALIDATION', 'ACCEPTED', 'CONFIDENTIAL'];
                $scope.rateUnits = ['SECONDS', 'MINUTES', 'HOURS', 'DAYS'];
                $scope.$watch('endpoint', function () {
                    if (!$scope.endpoint || !$scope.endpoint.operation) {
                        return;
                    }
                    $scope.addRate = function () {
                        $timeout(function () {
                            $scope.$apply(function () {
                                if (!$scope.endpoint.rates) {
                                    $scope.endpoint.rates = [];
                                }
                                $scope.endpoint.rates.push({});
                            });
                        });
                    };
                    $scope.removeRate = function (rate) {
                        $timeout(function () {
                            $scope.$apply(function () {
                                if (!$scope.endpoint.rates) {
                                    return;
                                }
                                $scope.endpoint.rates = _.without($scope.endpoint.rates, rate);
                            });
                        });
                    };
                });
            }]
        };
    }])

    .directive('appEndpointsDetailsResponseRequest', [function () {
        return {
            restrict: 'A',
            templateUrl: 'app/templates/app_endpoints_details_response_request.html',
            scope: true,
            controller: ['$scope', '$timeout', function ($scope, $timeout) {
                $scope.$watch('endpoint.operation', function() {
                    if ($scope.endpoint && $scope.endpoint.operation && $scope.endpoint.operation.responses) {
                        let positiveResponses = Object.keys($scope.endpoint.operation.responses)
                              .filter((httpStatus) => { return httpStatus.match('2..') ? true : false; });

                        if (positiveResponses && positiveResponses.length > 0) {
                            $scope.positiveResponse = $scope.endpoint.operation.responses[positiveResponses[0]];
                            let examples = $scope.positiveResponse.examples;
                            if (examples && examples['application/xml']) {
                                $timeout(function () {
                                    $scope.$apply(function () {
                                        // TODO: Handle other formats as well (also in UI)
                                        $scope.exampleResponseXml = examples['application/xml'];
                                    });
                                });
                            }
                        }

                        let errorResponse = $scope.endpoint.operation.responses.default;
                        console.log("ErrorResponse:");
                        console.log(errorResponse);
                        if (errorResponse && errorResponse.examples) {
                            $timeout(function () {
                                $scope.$apply(function () {
                                    $scope.errorResponseXml = errorResponse.examples['application/xml'];
                                });
                            });
                        }

                    }

                    $timeout(function () {
                        $scope.$apply(function () {
                            if (!$scope.endpoint.errors) {
                                $scope.endpoint.errors = [];
                            }
                            if (!$scope.endpoint.expectedValues) {
                                $scope.endpoint.expectedValues = [];
                            }
                        });
                    });
                });
                $scope.removeErrorCode = function (code) {
                    $timeout(function () {
                        $scope.$apply(function () {
                            $scope.endpoint.errors = _.without($scope.endpoint.errors, code);
                        });
                    });
                };
                $scope.addErrorCode = function () {
                    $timeout(function () {
                        $scope.$apply(function () {
                            $scope.endpoint.errors.push({
                                statusCode: 0,
                                errorCode: 0,
                                message: '',
                                description: ''
                            });
                        });
                    });
                };
                $scope.removeExpectedValue = function (value) {
                    $timeout(function () {
                        $scope.$apply(function () {
                            $scope.endpoint.expectedValues = _.without($scope.endpoint.expectedValues, value);
                        });
                    });
                };
                $scope.addExpectedValue = function () {
                    $timeout(function () {
                        $scope.$apply(function () {
                            $scope.endpoint.expectedValues.push({
                                name: '',
                                values: ''
                            });
                        });
                    });
                };
            }]
        };
    }])

    .directive('appEndpointsDetailsSee', ['$timeout', function ($timeout) {
        return {
            restrict: 'A',
            templateUrl: 'app/templates/app_endpoints_details_see.html',
            scope: {
                'endpoint': '='
            },
            controller: ['$scope', function ($scope) {
                this.addLink = function () {
                    $timeout(function () {
                        $scope.$apply(function () {
                            $scope.endpoint.metadata = $scope.endpoint.metadata || {};
                            $scope.endpoint.metadata.sees = $scope.endpoint.metadata.sees || [];
                            $scope.endpoint.metadata.sees.push({});
                        });
                    });
                };
                $scope.removeLink = function (link) {
                    $timeout(function () {
                        $scope.$apply(function () {
                            if ($scope.endpoint.metadata && $scope.endpoint.metadata.sees) {
                                $scope.endpoint.metadata.sees = _.without($scope.endpoint.metadata.sees, link);
                            }
                        });
                    });
                };
            }],
            link: function (scope, el, attrs, controller) {
                el.find('div.add-link').on('click', function () {
                    controller.addLink();
                    $timeout(function () {
                        var newItem = el.find('i[data-tribe-editable-text] > div').last();
                        newItem.focus();
                    }, 500); // TODO: please find a better way to do this after the meeting.
                });

            }
        };
    }])

    .directive('appEndpointsDetails', [function () {
        return {
            restrict: 'A',
            templateUrl: 'app/templates/app_endpoints_details.html',
            scope: {
                'applicationId': '=',
                'method': '=',
                'path': '='
            },
            controller: [
                '$scope', 'tribeEndpointsService', 'tribeFilterService', '$timeout', '$filter',
                function ($scope, srv, tribeFilterService, $timeout, $filter) {
                    $timeout(function () {
                        $scope.$apply(function () {
                            let httpMethod = $scope.method.toLowerCase();
                            $scope.endpoint = {
                                httpMethod: httpMethod,
                                path: $scope.path,
                                operation: {}
                            };
                            $scope.application = {};
                        });
                    }).then(function() {
                        srv.getDetails($scope.applicationId, $scope.method, $scope.path).then(function (detailsData) {
                            $timeout(function () {
                                $scope.$apply(function () {
                                    $scope.endpoint.httpMethod = detailsData.httpMethod;
                                    $scope.endpoint.path = $filter('pathencode')(detailsData.path);
                                    $scope.endpoint.operation = detailsData.operation;
                                });
                            });
                            srv.getApplicationDetails($scope.applicationId).then(function (applicationDetails) {
                                $timeout(function () {
                                    $scope.$apply(function () {
                                        if (!applicationDetails || !applicationDetails.swagger) {
                                            console.log("Got no application details!");
                                        }
                                        $scope.application = applicationDetails;
                                    });
                                });
                            });
                        });
                    });
                }
            ]
        };
    }])

    .run(function () {
        // placeholder
    });