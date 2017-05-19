/*******************************************************************************
 *     Copyright 2016-2017 the original author or authors.
 *     
 *     This file is part of CONC.
 *     
 *     CONC. is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU Affero General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *     
 *     CONC. is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *     GNU Affero General Public License for more details.
 *     
 *     You should have received a copy of the GNU Affero General Public License
 *******************************************************************************/


/**
 * Can't use fat arrow syntax in service definition due to:
 * https://github.com/angular/angular.js/issues/14814
 */
angular.module('concentrate')
.service('ReferenceService', function($log, $http, $rootScope, HateoasUtilsService, FailedRequestService) {

    let referenceServiceHttpErrorHandler = e => {

        $rootScope.activeReferenceGenome = undefined;
        $rootScope.availableReferenceGenomes = new Array();

        FailedRequestService.add(new FailedRequest(e.config.method, e.status, e.config.url, e.data));
    };

    return {
        discoverGenomes: () => {
            $http.get('/references').then(
                res => {
                    if (!res.data || !res.data['_embedded'] || !res.data['_embedded'].referenceGenomes) {
                        return Promise.all([]);
                    } else {
                        return Promise.all(res.data['_embedded'].referenceGenomes.map(it => $http.get(`/references/${it.id}`)));
                    }
                },
                referenceServiceHttpErrorHandler
            ).then(
                resArray => {

                    $rootScope.activeReferenceGenome = undefined;
                    $rootScope.availableReferenceGenomes = resArray.map(it => new ReferenceGenome(HateoasUtilsService.getResourceId(it.data), it.data['contigs']));

                    $rootScope.genomicCoordinateComparator = new GenomicCoordinateComparator($rootScope.availableReferenceGenomes);
                },
                referenceServiceHttpErrorHandler
            );
        }
    }
});