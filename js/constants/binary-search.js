class BinarySearchException {

    /**
     * @constructor
     * @this {BinarySearchException}
     * @param {Object} arr Input object
     * @param {String} message Exception message
     */
    constructor(arr, message) {
        this._arr = arr;
        this._message = message;
    }

    get arr     ()  { return this._arr      }
    get message ()  { return this._message  }
}

class BinarySearch {

    /**
     * @static {BinarySearch}
     * @param {Object[]} arr Sorted array to search index in
     * @param {Object} val Value to search index of
     * @param {function} comp Array values compare function
     * @returns {number} Index of an array element of the same value if present in the array or previous element index
     */
    static indexSearch(arr, val, comp) {

        if (!(arr instanceof Array)) {
            throw new BinarySearchException(arr, `Input object must be an Array, but was ${typeof arr}`);
        }

        if (comp(val, arr[0]) < 0) {
            return -1;
        }
        if (comp(val, arr[arr.length - 1]) > 0) {
            return arr.length;
        }

        let [left, right] = [0, arr.length - 1];
        let pointer, elem, res;
        while (left <= right) {

            res = pointer = Math.floor((left + right) / 2);
            elem = arr[pointer];
            if (comp(elem, val) < 0) {
                left = pointer + 1;
            }
            else if (comp(elem, val) > 0) {
                right = pointer - 1;
            }
            else {
                return pointer;
            }
        }

        return right;
    }

    /**
     * @static {BinarySearch}
     * @param {Object[]} arr Sorted array to search index in
     * @param {Object} val Value to search
     * @param {function} comp Array values compare function
     * @returns {boolean} Whether specified value contains in the array
     */
    static contains(arr, val, comp) {

        if (!(arr instanceof Array)) {
            throw new BinarySearchException(arr, `Input object must be an Array, but was ${typeof arr}`);
        }

        if (comp(val, arr[0]) < 0 || comp(val, arr[arr.length - 1]) > 0) {
            return false;
        }

        let [left, right] = [0, arr.length - 1];
        let pointer, elem, res;
        while (left <= right) {

            res = pointer = Math.floor((left + right) / 2);
            elem = arr[pointer];
            if (comp(elem, val) < 0) {
                left = pointer + 1;
            }
            else if (comp(elem, val) > 0) {
                right = pointer - 1;
            }
            else {
                return true;
            }
        }

        return false;
    }
}

angular.module('ghop-ui')
.constant('BinarySearch', BinarySearch);