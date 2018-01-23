module.exports = function complex (object) {
    if (object) {
        if (object.foo) {
            if (object.foo.bar) {
                return clean();
            }
        }
    }
};

function clean() {}
