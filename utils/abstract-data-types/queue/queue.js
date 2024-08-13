//@ts-check
/**
 * @template T
 */
class Queue {

    constructor(){

        /**
         * @type {Array<T>}
         */
        this.myQueue = [];
        this.queueHead = 0;
        this.queueTail =  0;

        //Head never changes
        Object.freeze(this.queueHead);
    }

    /**
     * @type {QueueInstance<T>['enqueue']}
     */
    enqueue(item){

        //Adding to end, so using tail
        this.myQueue[this.queueTail++] = item;
    }

    /**
     * 
     * @type {QueueInstance<T>['dequeue']}
     */
    dequeue(){

        if(!this.isEmpty()){

            //Removing from head of queue
            const item =  this.myQueue[this.queueHead];
            //Remove
            this.myQueue.splice(this.queueHead, 1);
            //Update queue tail
            this.queueTail--;
            return item;
        }

        return undefined;
    }

    /**
     * @type {QueueInstance<T>['peek']}
     */
    peek(){

        return this.myQueue[this.queueHead];
    }

    /**
     * Get the value at the tail of the queue
     * @type {QueueInstance<T>['tail']}
     */
    tail(){

        return this.myQueue[this.queueTail - 1];
    }

    /**
     * @type {QueueInstance<T>['clear']}
     */
    clear(){

        while(!this.isEmpty()){
            
            this.dequeue();
        }
    }

    /**
     * @type {QueueInstance<T>['forEach']}
     */
    forEach(cb){

        const queueCopy = this.copy();
        //It's an active update. So, get original and save
        const length = queueCopy.length;
        for(let i = 0; i < length; i++){

            if(cb(queueCopy.dequeue())){
                
                break;
            };
        }
    }

    /**
     * Joins the provided queue to the end of the queue in this instance
     * @type {QueueInstance<T>['join']}
     */
    join(queue){

        const copyQueue = queue.copy();
        copyQueue.forEach((item) => {

            this.enqueue(item);
        });
    }

    /**
     * @type {QueueInstance<T>['copy']}
     */
    copy(){

        /**
         * @type {Queue<T>}
         */
        const queueCopy = new Queue();
        queueCopy.myQueue = this.myQueue.map((item) => item);
        //Tail update
        queueCopy.queueTail = this.queueTail;
        return queueCopy
    }

    /**
     * 
     * @type {QueueInstance<T>['position']} 
     */
    position(item){

        let position = null;
        const queueCopy = this.copy();
        //Using this.length to ensure value doesn't change
        //Hopefully referenced once and that's it. Not continuous get, since change
        //Will affect other algos
        for(let i = 0; i < this.length; i++){

            if(queueCopy.dequeue() === item){

                position = i;
                break;
            }
        }

        return position;
    }

    /**
     * Using algo below to avoid touching this.myQueue directly and have heads and tails update correctly
     * Less buggy
     * @type {QueueInstance<T>['sortDelete']} 
     */
    sortDelete(item){

        /**
         * @type {QueueInstance<T>}
         */
        const sortedQueue = new Queue();
        //Put in FIFO order unaffected items in sorted queue from this queue
        //FIFO respected in both, so will be fine
        const length = this.length;
        for(let i = 0; i < length; i++){

            const queueItem = this.dequeue();
            if(queueItem !== item){

                sortedQueue.enqueue(queueItem);
            }
        }

        //Now return back to this queue
        sortedQueue.forEach((queueItem) => {

            this.enqueue(queueItem);
        });
    }

    /**
     * Deletes the item at the given position then resets the items after
     * 
     * @type {QueueInstance<T>['deleteAtPos']}
     */
    deleteAtPos(pos){

        /**
         * @type {Queue<T>}
         */
        const filteredQueue = new Queue();
        /**
         * @type {T}
         */
        let deletedItem = null;
        this.forEach((item, index) => {

            if(index !== pos){

                filteredQueue.enqueue(item);
            } else {

                deletedItem = item;
            }
        });

        this.clear();
        filteredQueue.forEach((item) => {

            this.enqueue(item);
        });
        filteredQueue.clear();

        return deletedItem;
    }

    /**
     * 
     * @type {QueueInstance<T>['find']}
     */
    find(checkFn){

        const copyQueue = this.copy();
        let match = null;
        const length = this.length;
        for(let i = 0; i < length; i++){

            if(checkFn(copyQueue.peek())){

                match = copyQueue.dequeue();
                break;
            }

            copyQueue.dequeue();
        }

        return match;
    }

    /**
     * @type {QueueInstance<T>['length']}
     */
    get length(){

        return this.queueTail - this.queueHead;
    }

    /**
     * 
     * @returns {boolean}
     */
    isEmpty(){

        return this.length === 0;
    }
}

if(false){

    /**
     * @type {QueueConstructor<*>}
     */
    const QueueTest = Queue;
}

export default Queue;