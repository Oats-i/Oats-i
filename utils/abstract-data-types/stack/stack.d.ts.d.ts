declare module "Stack" {

    interface StackInstance<T>{

        push(item: T): void;
        pop(): T;
        peek(): T;
        isEmpty(): boolean;
        size(): number;
        copy(): StackInstance<T>;
        reverseCopy(): StackInstance<T>;
        clear(): void;
        matches(checkStack: StackInstance<T>): boolean;
        contains(item: T): boolean;
        sortDelete(item: T): void;
        find(comparator: genericParamReturnFunction<T, boolean>): T;
        //Top stack goes to top of current stack, and its tos becomes the base stack's tos
        mergeWith(topStack: StackInstance<T>): void;
    }

    interface StackConstructor<T>{

        new(): StackInstance<T>;
    }
}