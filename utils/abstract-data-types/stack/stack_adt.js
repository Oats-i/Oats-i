//@ts-check

/**
 * @template i
 */
class Stack{

    constructor(){

        /**
         * @type {Object.<string, i>}
         */
        this.myStack = {};

        this.currObjNum = -1; //Always increments so keys are always ordered correctly following LIFO order

        //Use auto ordering of objects to get it? https://javascript.info/object#ordered-like-an-object - YES
        //Easier solution for js. As it orders keys. Implement as a linked list or fixed array in other languages
    }

    /**
     * @type {import("Stack").StackInstance<i>['push']}
     */
    push(i){

        this.myStack[`${++this.currObjNum}`] = i;
    }

    /**
     * @type {import("Stack").StackInstance<i>['pop']}
     */
    pop(){

        if(!this.isEmpty()){

            const tos = getTos(this.myStack);

            const popVal = this.myStack[tos];
            delete this.myStack[tos];

            return popVal;
        } else {

            return null;
        }
    }

    /**
     * @type {import("Stack").StackInstance<i>['peek']}
     */
    peek(){

        if(!this.isEmpty()){

            return this.myStack[getTos(this.myStack)];
        } else {

            return null;
        }
    }

    /**
     * @type {import("Stack").StackInstance<i>['isEmpty']}
     */
    isEmpty(){

        return getTos(this.myStack) === undefined;
    }

    /**
     * @type {import("Stack").StackInstance<i>['size']}
     */
    size(){

        return Object.keys(this.myStack).length;
    }

    /**
     * Create a shallow copy of a stack of this type
     * 
     * REMEMBER, stack object copied, but any values stored by reference (objects or instances) not copied.
     * Thus, still point to original. Shallow copy
     * 
     * @type {import("Stack").StackInstance<i>['copy']}
     */
    copy(){

        let copyStack = new Stack();
        copyStack.currObjNum = this.currObjNum;
        
        for(let key in this.myStack){

            copyStack.myStack[key] = this.myStack[key];
        }

        return copyStack;
    }

    /**
     * @type {import("Stack").StackInstance<i>['reverseCopy']}
     */
    reverseCopy(){

        const normalCopy = this.copy();
        const normalCopySize = normalCopy.size();
        const reverseCopy = new Stack();
        reverseCopy.currObjNum = this.currObjNum;
        
        for(let i = 0; i < normalCopySize; i++){

            reverseCopy.push(normalCopy.pop());
        }

        return reverseCopy;
    }

    /**
     * Clears the current stack
     * @type {import("Stack").StackInstance<i>['clear']}
     */
    clear(){

        if(!this.isEmpty()){

            this.currObjNum = -1;
            this.myStack = {};
        }
    }

    /**
     * whether the testStack matches the calling stack
     * @type {import("Stack").StackInstance<i>['matches']}
     */
    matches(testStack){

        const copyOfThis = this.copy();
        const copyOfTest = testStack.copy();
        
        //First test of matches. Size and tos MUST match.
        //Popping in test of tos match so that next algo picks from new tos
        let matches = copyOfThis.size() === copyOfTest.size() && copyOfThis.pop() === copyOfTest.pop();

        if(matches){

            //Every stack item must match. Doing this cause of different permutations a stack can take
            //MUST MATCH, thus not override original resolve to false, if it was true
            for(let i = 0; i < this.size(); i++){

                if(copyOfThis.pop() !== copyOfTest.pop()){
    
                    matches = false;
                    break;
                }
            }
        }

        //At this point, true is the resolve of the first test. False can be from the first test or second test of all stack items.
        return matches;
    }

    /**
     * @type {import("Stack").StackInstance<i>['contains']}
     */
    contains(item){

        const copy = this.copy();
        return checkItem(copy);

        /**
         * Recursively checks for a match
         * @param {import("Stack").StackInstance<i>} targetStack 
         * @returns {boolean}
         */
        function checkItem(targetStack){

            if(!targetStack.isEmpty()){

                return targetStack.pop() === item ? true : checkItem(targetStack);
            } else {

                return false;
            }
        }
    }

    /**
     * Deletes a specific item then sorts the stack back to order
     * 
     * Very useful utility function for special cases
     * 
     * Can be expensive, O(n)
     * @type {import("Stack").StackInstance<i>['sortDelete']}
     */
    sortDelete(i){

        /**
         * @type {Stack<i>}
         */
        const sortedStack = new Stack();
        /**
         * @type {i}
         */
        let item = null;
        while (!this.isEmpty()){

            item = this.pop();
            if(item !== i){

                sortedStack.push(item);
            }
        }

        //Now, copy what is in sorted to this. Will reverse to correct order
        while(!sortedStack.isEmpty()){

            this.push(sortedStack.pop());
        }
    }

    /**
     * @type {import("Stack").StackInstance<i>['find']}
     */
    find(testingFunc){

        //Get a copy
        const copyStack = this.copy();

        /**
         * @type {i}
         */
        let match = null;

        //Look for match
        while(!copyStack.isEmpty()){

            if(testingFunc(copyStack.peek())){

                match = copyStack.pop();
                break;
            }

            copyStack.pop();
        }

        return match;
    }

    /**
     * @type {import("Stack").StackInstance<i>['mergeWith']}
     */
    mergeWith(topStack){

        //Getting reverse copy so we invert entries. Then push to this stack in correct order, maintaining tos
        const topStackReverseCopy = topStack.reverseCopy();
        
        while(!topStackReverseCopy.isEmpty()){

            this.push(topStackReverseCopy.pop());
        }
    }
}

/**
 * @param {Object} stackObj
 * @returns {string}
 */
function getTos(stackObj){

    const keys = Object.keys(stackObj);
    if(keys.length === 0){

        return undefined;
    }
    //tos is the largest currObjNum in stack
    const tos = keys[keys.length - 1];

    return tos;
}

if(false){

    /**
     * @type {import("Stack").StackConstructor<*>}
     */
    const check = Stack;
}

export default Stack;