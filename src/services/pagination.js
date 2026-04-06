<<<<<<< HEAD
export function paginate(page,size) {
    if (!page || page<=0) {
        page = 1
    }
    if (!size || size<=0) {
        size = 10
    }
    const skip = (page - 1) * size
    return {limit:size,skip} 
}
=======
export function paginate(page,size) {
    if (!page || page<=0) {
        page = 1
    }
    if (!size || size<=0) {
        size = 10
    }
    const skip = (page - 1) * size
    return {limit:size,skip} 
}
>>>>>>> f59f8c9a07eb5e092a4064584f266909927768d9
// ?page=3&size=1