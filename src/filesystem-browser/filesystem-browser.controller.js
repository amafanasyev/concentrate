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


angular.module('concentrate')
.controller('FilesystemBrowserController', ['$log', '$scope', '$rootScope', 'FilesystemBrowserService',
        function($log, $scope, $rootScope, FilesystemBrowserService) {

    $scope.isActive = file => $scope.ngModel === file;
    $scope.collapse = () => $scope.collapsed ? $scope.collapsed = false : $scope.collapsed = true;

    $scope.updateContent = folder => {

        $scope.folder = folder;
        $scope.folders = Array.from(folder.folderRefs.entries()).map(it => {
            return {
                name: it[0],
                href: it[1]
            }
        });
    };

    $scope.failureHandler = e => {

        $log.error('Error during filesystem\'s content request, see response object for more details');
        $log.error(e);
    };

    $scope.open = folder => {
        FilesystemBrowserService.getContentUsing(folder.href)
                .then($scope.updateContent, $scope.failureHandler);
    }

    $scope.select = file => $scope.ngModel = file;
}]);