angular.module('ghop-ui')
.controller('MainController', 
    ['$scope', '$log', '$uibModal', '$exceptionHandler', 'AsyncService', 'TrackService', 'DataSourceService', 
        'HateoasUtils', 'ReferenceGenomeService', 'StriperFactory', 
        'CanvasSettings', 'CanvasValues', 'TrackDataSource', 'TrackAttributes', 'DrawerFactory', 
        'TrackUtils', 'RelationsService', 'TrackFilters', 'ReferenceServiceSelector', 'ReferenceServiceType', 'ReferenceTrack',
    ($scope, $log, $uibModal, $exceptionHandler, AsyncService, TrackService, DataSourceService, 
        HateoasUtils, ReferenceGenomeService, StriperFactory, 
        CanvasSettings, CanvasValues, TrackDataSource, TrackAttributes, DrawerFactory, 
        TrackUtils, RelationsService, TrackFilters, ReferenceServiceSelector, ReferenceServiceType, ReferenceTrack) => {

    $log.debug('Application main controller running');

    $scope.showMenuPanel = false;
    $scope.selectedObject = {};

    let unitsCountPerLayer = () => Math.ceil((window.innerWidth - CanvasSettings.CANVAS_MARGIN) / CanvasSettings.UNIT_WIDTH);

    $scope.lockBtns = true;

    let genomicCoordinate,
        canvasElement,
        canvas,
        stage;

    let arrowsNavigationHandler = keyDownEvent => {

        switch (keyDownEvent.keyCode) {
            case 39:
                // Left arrow key code
                $scope.striper.leftTrivialHop();
                break;

            case 37:
                // Right arrow key code
                $scope.striper.rightTrivialHop();
                break;

            default:
                return;
        }
        
        $scope.contig = $scope.striper.coord.contig;
        revealStripes();
    };

    let initCanvas = () => {

        let canvasElement = angular.element('canvas');
        canvas = canvasElement[0];
        canvas.width = canvasElement.width();
        canvas.height = canvasElement.height();
        stage = new createjs.Stage(canvas);
        // enable touch interactions if supported on the current device:
        createjs.Touch.enable(stage);
        stage.enableMouseOver(50);

        let prevWith = window.innerWidth;
        $(window).resize(() => {
            // redraw canvas only for width changes
            if (prevWith !== window.innerWidth ) {
                // instant redrawing canvas on increase windows width, unit by unit redrawing on decrease
                if (prevWith < window.innerWidth || prevWith - window.innerWidth >= CanvasSettings.UNIT_WIDTH) {
                    prevWith = window.innerWidth;
                    $scope.$apply(() => {
                        canvasElement.width(window.innerWidth);
                        canvas.width = canvasElement.width();
                        CanvasValues.maxUnitCountPerTrack = unitsCountPerLayer();

                        $scope.updateStriper(true);
                    });
                }
            }
        });

        let $doc = angular.element(document);
        $doc.on('keydown', arrowsNavigationHandler);
        $scope.$on('$destroy', () => $doc.off('keydown', arrowsNavigationHandler));
    }

    $scope.navOpen = false;
    $scope.coord = 0;
    CanvasValues.maxUnitCountPerTrack = unitsCountPerLayer();
    $scope.relationService = RelationsService.newInstance('#tracks_tree', '#tracks_images', 'track');
    initCanvas();   

    $scope.sortableOptions = {
        stop: function(e, ui) {
            $scope.relationService.updateRelations($scope.selectedTracks);
            $scope.updateStriper(true);
        },
        axis: 'y'
    };

    $scope.toggleNav = () => {

        if ($scope.navOpen) {
            $('nav').css('right', -$('nav').width());
            $('#nav-expander').css('right', 0);
        } else {
            $('nav').css('right', 0);
            $('#nav-expander').css('right', $('nav').width());
        }

        $scope.navOpen = !$scope.navOpen;
    }

    $scope.onSelectTracks = () => {

        updateTracksHeight();
        $scope.relationService.relations = [];
        $scope.selectedTracks.forEach(track => {
            $scope.relationService.relations.push(
                $scope.relationService.createRelation(track.track, undefined, 'SINGLE', 0, [track])
            );
        });

        let canvasElement = angular.element('canvas');
        let height = CanvasSettings.CANVAS_PADDING_TOP
            + $scope.selectedTracks.length*(CanvasSettings.LAYER_BASE_HEIGHT + CanvasSettings.SPACE_BETWEEN_LAYERS)*2;

        canvasElement.height(Math.max(height, CanvasSettings.CANVAS_MIN_HEIGHT));
        canvas.height = canvasElement.height();

        (!$scope.striper) ? $scope.createStriper() : $scope.updateStriper(true);
    };

    $scope.onAddRelationCallback = () => {
        let lvl = $scope.relationService.maxLvl;
        let svgWidth = lvl * CanvasSettings.SVG_TREE_LVL_WIDTH + CanvasSettings.SVG_TREE_RIGHT_PADDING;
        $('nav').width(CanvasSettings.MENU_PANEL_MIN_WIDTH + svgWidth);
        $('#nav-expander').css('right', $('nav').width());
        $('#tracks_tree_svg').width(svgWidth);
        $('#tracks_tree_svg').height(canvas.height);
    };

    let updateTracksHeight = () => {
        $scope.selectedTracks.forEach(track => {

            let baseHeight = CanvasSettings.LAYER_BASE_HEIGHT*track.sublayersCount;
            if (track.attributes !== undefined) {
                let filteredAttributes = track.attributes.filter(attr => (attr.disabled !== true && attr.value !== undefined));
                let minHeight = CanvasSettings.LAYER_BASE_HEIGHT + filteredAttributes.length * CanvasSettings.FILTERS_SMALL_LINE_HEIGHT;
                track.style.height = Math.max(minHeight, baseHeight);
            } else {
                track.style.height = baseHeight;
            }
        });
    };

    let layerChangeHandler = () => {

        updateTracksHeight();
        $scope.relationService.updateRelations($scope.selectedTracks);
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    };

    $scope.tracks = [];
    $scope.selectedTracks = [];

    $scope.positionInputDisabled = () => $scope.selectedTracks.length === 0;

    ReferenceServiceSelector.toggle({ type: ReferenceServiceType.REMOTE }).$promise.then(
        () => {

            $log.debug('Application switched to use remote reference service')

            ReferenceGenomeService.referenceGenomeIds.then(ids => {

                $scope.referenceGenomeIds = ids;
                $scope.genome = $scope.referenceGenomeIds.find(id => id === 'GRCh37.p13');
                if (!$scope.genome) {
                    $log.error('Faild to find GRCh37.p13 in available references list!');
                } else {
                    $log.debug('GRCh37.p13 reference has been selected as a default reference');
                }

                ReferenceTrack.select({ id: $scope.genome }).$promise.then(chromosomeTrack => {

                    AsyncService.asyncHandle(ReferenceGenomeService.contigsMapping, mapping => {

                        $scope.contigsMapping = mapping;

                        if ($scope.contigsMapping['GRCh37.p13'].length) {

                            $log.debug(`Found ${$scope.contigsMapping[$scope.genome].length} contigs for GRCh37.p13: ${$scope.contigsMapping['GRCh37.p13']}`);

                            $scope.contig = $scope.contigsMapping['GRCh37.p13'][0];
                            $scope.coord = 1;
                        }
                    });

                    TrackService.findAll().then(
                        tracksResource => {
                            
                            $scope.tracks = tracksResource['_embedded'].tracks;
                            $scope.tracks.forEach(track => {

                                track.style = {
                                    height: CanvasSettings.LAYER_BASE_HEIGHT
                                }
                                track.sublayersCount = 1;

                                TrackDataSource.get({ id: track.track }).$promise.then(dataSource => track.dataSource = dataSource);

                                TrackAttributes.get({ id: track.track }).$promise.then(attributes => {

                                    if (!attributes['_embedded']) {
                                        track.attributes = new Array();
                                        return;
                                    }

                                    track.attributes = attributes['_embedded'].attributes;

                                    track.attributes.forEach(attr => {

                                        attr.style = {
                                            height: CanvasSettings.ATTRIBUTE_HEIGHT[attr.type]
                                        };

                                        attr.value = (!attr.value) ? CanvasSettings.ATTRIBUTE_VALUES[attr.type] : attr.value;
                                        attr.filterOperator = attr.filterOperators ? attr.filterOperators[0] : '|';
                                        attr.disabled = true;
                                    });
                                });
                            });

                            draw(new Array());
                        },
                        error => $log.error(error)
                    );
                }, error => $log.error(error));
            });
        },
        error => $log.error(error));

    AsyncService.asyncHandle(ReferenceGenomeService.dataSourceTypes, types => $scope.dataSourceTypes = types['_embedded'].dataSourceTypes);

    $scope.toggleMenuPanel = () => $scope.showMenuPanel = !$scope.showMenuPanel;

    $scope.openTrackCreationModal = () => {

        let modalInstance = $uibModal.open({
            animation: true,
            controller: 'TrackCreationController',
            size: 'md',
            resolve: {
                dataSourceTypes: () => $scope.dataSourceTypes,
                genome: () => $scope.genome,
                trackNames : () => $scope.tracks.map(track => track.track)
            },
            templateUrl: 'templates/modals/track-creation.html'
        });

        modalInstance.result.then(
            trackResource => {

                $log.info(`Created ${trackResource.track} track on uri: ${HateoasUtils.getResourceUri(trackResource)}`);

                $scope.tracks.push(trackResource);

                TrackDataSource.get({ id: trackResource.track }).$promise.then(dataSource => {
                    trackResource.dataSource = dataSource;
                    trackResource.ticked = true;
                    trackResource.style = {
                        height: CanvasSettings.LAYER_BASE_HEIGHT
                    };
                    trackResource.sublayersCount = 1;
                    $scope.selectedTracks.push(trackResource);
                    $scope.onSelectTracks();
                });

                TrackAttributes.get({ id: trackResource.track }).$promise.then(attributes => {

                    trackResource.attributes = attributes['_embedded'].attributes;
                    trackResource.attributes.forEach(attr => {

                        attr.style = {
                            height: CanvasSettings.ATTRIBUTE_HEIGHT[attr.type]
                        };

                        attr.value = (!attr.value) ? CanvasSettings.ATTRIBUTE_VALUES[attr.type] : attr.value;
                        attr.filterOperator = attr.filterOperators ? attr.filterOperators[0] : '|';
                        attr.disabled = true;
                    });
                });
            },
            () => $log.info('Track creation dismissed')
        );
    };

    $scope.openTracksEditionModal = () => {

        let modalInstance = $uibModal.open({
            animation: true,
            controller: 'TracksEditionController',
            size: 'md',
            resolve: {
                tracks: () => $scope.tracks
            },
            templateUrl: 'templates/modals/tracks-edition.html'
        });

        modalInstance.result.then(() => $scope.createStriper(), () => $log.info('Track creation dismissed'));
    };

    let showObjectDetails = stripe => {
        $scope.selectedObject = stripe;
        $scope.$apply();
    };

    $scope.openFiltersModal = trackName => {

        let track = $scope.selectedTracks.find(track => track.track === trackName);
        if (!track) {
            return $exceptionHandler(`Cannot find track object with name "${trackName}"`);
        }

        let attributesBackup = angular.copy(track.attributes);
        let aggregatesBackup = track.aggregates === undefined ? [] : angular.copy(track.aggregates);

        let modalInstance = $uibModal.open({
            templateUrl: 'templates/modals/filters-modal.html',
            controller: 'AttributesModalController',
            resolve: {
                track: () => track
            }
        });

        modalInstance.result.then(filter => {

            if (filter.filters.length) {

                TrackFilters.save({ id: trackName }, angular.toJson(filter)).$promise.then(dataSource => {

                    track.dataSource = dataSource;
                    track.aggregates = dataSource.aggregates;
                    $scope.updateStriper(true);
                });
            } else {

                TrackDataSource.get({ id: trackName }).$promise.then(dataSource => {

                    track.dataSource = dataSource;
                    track.aggregates = [];
                    $scope.updateStriper(true);
                });
            }
        }, response => {

            $log.warn(response);
            // restore attributes and aggregates
            track.aggregates = aggregatesBackup;
            track.attributes = attributesBackup;
        });
    };

    let draw = stripes => {

        CanvasValues.maxUnitCountPerTrack = unitsCountPerLayer();
        CanvasValues.maxStripeLength = 1;

        DrawerFactory.instance(
            stage, 
            canvas,
            $scope.selectedTracks,
            $scope.striper,
            showObjectDetails,
            layerChangeHandler
        ).draw(stripes);
    };

    $scope.createStriper = () => {

        genomicCoordinate = new GenomicCoordinate($scope.genome, $scope.contig, $scope.coord);
        $scope.striper = StriperFactory.newStriperInstance(
            genomicCoordinate, 0, CanvasValues.maxUnitCountPerTrack,
            $scope.tracks.filter(track => track.ticked).map(elem => elem.dataSource.id), 
            $scope.contigsMapping);
            
        revealStripes();
    };

    $scope.getSelectedFilters = track => {

        if (track.attributes === undefined) {
            return '';
        }

        let selectedAttrs = [];
        track.attributes
            .filter(attr => (attr.disabled !== true && attr.value !== undefined))
            .map(attr => {
                let label = attr.name;
                if (attr.filter_operator !== undefined) {
                    if (attr.filter_operator === '=') {
                        label += ':';
                    } else {
                        label += '\xa0' + attr.filter_operator;
                    }
                }
                label += '\xa0' + attr.value;
                selectedAttrs.push(label);
            });
        updateTracksHeight();
        return selectedAttrs.length > 0 ? selectedAttrs.join(';\n ') : '';
    };

    $scope.updateStriper = (sameCoord = false) => {

        if (!$scope.striper) {
            return;
        }

        $scope.striper.dataSources = $scope.selectedTracks.map(track => track.dataSource.id);

        if (sameCoord) {
            $scope.striper.hopTo($scope.striper.coord, 0, CanvasValues.maxUnitCountPerTrack);
        } else {
            $scope.striper.hopTo(
                new GenomicCoordinate($scope.genome, $scope.contig, $scope.coord), 
                0, CanvasValues.maxUnitCountPerTrack);
            $scope.selectedObject = {};
        }

        revealStripes();
    };

    let revealStripes = () => $scope.striper.stripes.then(stripes => draw(stripes), error => $log.error(error));
}]);