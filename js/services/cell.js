/**
 * The cell - the smallest structural element of the canvas.
 * It's width is always equal to one unit,
 * and height depends on the amount of "stripes", which intersect at that cell.
 */
class Cell {
    
    constructor (id, col, row) {

        this._col = col;
        this._id = id;
        this._row = row;
        this._stripes = [];
        this._leftInf = false;
        this._rightInf = false;
    }

    set id       (id)       { this._id = id             }
    get id       ()         { return this._id           }
    set col      (col)      { this._col = col           }
    get col      ()         { return this._col          }
    set row      (row)      { this._row = row           }
    get row      ()         { return this._row          }

    /**
     * There is a list of the stripes, which intersects in this Cell
     * we set it in Table._calcCellRanges() method with leftInf and rightInf params
     */
    set stripes  (stripes)  { this._stripes = stripes   }
    get stripes  ()         { return this._stripes      }

    /**
     * An indication that at least one object in the cell 
     * starts or ends outside of the displayed area
     */
    set leftInf  (leftInf)  { this._leftInf = leftInf   }
    get leftInf  ()         { return this._leftInf      }
    set rightInf (rightInf) { this._rightInf = rightInf }
    get rightInf ()         { return this._rightInf     }
}

angular.module('ghop-ui').value('Cell', Cell);