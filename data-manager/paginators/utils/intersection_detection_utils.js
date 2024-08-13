const IntersectionDetectionUtils = {

    /**
     * 
     * @param {Element} rootElement 
     * @param {number} threshold 
     * @param {Element} target 
     * @param {genericFunction} onIntersectCallback 
     * @returns {IntersectionObserver}
     */
    initIntersector: (rootElement, threshold, target, onIntersectCallback) => {

        let options = {

            root: rootElement,
            rootMargin: "0px",
            threshold: threshold
        }

        let observer = new IntersectionObserver(intersectionCallback.bind(this, onIntersectCallback), options);
        observer.observe(target);

        //To allow for disconnecting later
        return observer;
    }
}

/**
 * 
 * @param {*} onIntersectCallback 
 * @param {IntersectionObserverEntry[]} entries 
 * @param {*} observer 
 */
function intersectionCallback(onIntersectCallback, entries, observer){

    entries.forEach((entry) => {

        if(entry.isIntersecting){

            onIntersectCallback();
        }
    })
}

export default IntersectionDetectionUtils;