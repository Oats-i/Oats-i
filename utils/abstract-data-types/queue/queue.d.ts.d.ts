declare module "Queue" {

    declare interface QueueInstance<T> {

        enqueue(value: T): void;
        dequeue(): T;
        peek(): T;
        tail(): T;
        get length(): number;
        isEmpty(): boolean;
        clear(): void;
        //You can return true to break the loop
        forEach(cb: (value: T, index?: number) => boolean | void): void;
        copy(): QueueInstance<T>;
        join(queue: QueueInstance<T>): void;
        position(value: T): number;
        sortDelete(value: T): void;
        deleteAtPos(pos: number): T;
        find(checkFn: genericParamReturnFunction<T, boolean>): T;
    }

    declare interface QueueConstructor<T> {

        new(): QueueInstance<T>;
    }
}