const clockInitialState = {
    time: new Date(),
};
const auctionInitialState = {
    lots: null,
};

const SET_TIME = 'SET_TIME';
const SET_LOTS = 'SET_LOTS';
const CHANGE_LOT_PRICE = 'CHANGE_LOT_PRICE';
const FAVORITE_LOT = 'FAVORITE_LOT';
const UNFAVORITE_LOT = 'UNFAVORITE_LOT';

class Store {
    constructor(reducer, initialState) {
        this.reducer = reducer;
        this.state = reducer(initialState, {type: null});
        this.listeners = [];
    }
    getState() {
        return this.state;
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.inexOf(listener);
            this.listeners.splice(index, 1);
        };
    }
    dispatch(action) {
        this.state = this.reducer(this.state, action);
        this.listeners.forEach((listener) => listener());
    }
}

const store = new Store(combineReducers({
    clock: clockReducer,
    auction: auctionReducer,
}));

const VDom = {
    createElement: (type, config, ...children) => {
        const key = (config && config.key) || null;
        const props = config || {};
        if (children.length === 1) {
            props.children = children[0];
        } else {
            props.children = children;
        }
        return {
            type,
            key,
            props,
        };
    },
};
const api = {
    get(url) {
        switch (url) {
        case '/lots': return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        id: 1,
                        name: 'Apple',
                        description: 'Apple description',
                        price: 16,
                        favorite: true,
                    },
                    {
                        id: 2,
                        name: 'Orange',
                        description: 'Orange description',
                        price: 21,
                        favorite: false,
                    }
                ]);
            }, 1000);
        });
        default: throw new Error('Unknown address');
        }
    },
    post(url) {
        if (/^\/lots\/(\d+)\/favorite$/.exec(url)) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({});
                }, 500);
            });
        }
        if (/^\/lots\/(\d+)\/unfavorite$/.exec(url)) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({});
                }, 500);
            });
        }
        throw new Error('Unknown address');
    },
};
const stream = {
    subscribe(channel, listener) {
        const match = /price-(\d+)/.exec(channel);
        if (match) {
            setInterval(() => {
                listener({
                    id: parseInt(match[1]),
                    price: Math.round((Math.random() * 10 + 30)),
                });
            }, 400);
        }
    },
};

function renderView(store) {
    render(
        <App store={store}/>,
        document.getElementById('root')
    );
}
store.subscribe(() => {
    renderView(store);
});

renderView(store);

function combineReducers(reducers) {
    return (state = {}, action) => {
        const result = {};
        Object.entries(reducers).forEach(([key, reducer]) => {
            result[key] = reducer(state[key], action);
        });
        return result;
    };
}
function clockReducer(state = clockInitialState, action) {
    switch (action.type) {
    case SET_TIME:
        return {
            ...state,
            time: action.time,
        };
    default: return state;
    }
}
function auctionReducer(state = auctionInitialState, action) {
    switch (action.type) {
    case SET_LOTS:
        return {
            ...state,
            lots: action.lots,
        };
    case CHANGE_LOT_PRICE:
        return {
            ...state,
            lots: state.lots.map((lot) => {
                if (lot.id === action.id) {
                    return {
                        ...lot,
                        price: action.price,
                    };
                }
                return lot;
            }),
        };
    case FAVORITE_LOT:
        return {
            ...state,
            lots: state.lots.map((lot) => {
                if (lot.id === action.id) {
                    return {
                        ...lot,
                        favorite: true,
                    };
                }
                return lot;
            }),
        };
    case UNFAVORITE_LOT:
        return {
            ...state,
            lots: state.lots.map((lot) => {
                if (lot.id === action.id) {
                    return {
                        ...lot,
                        favorite: false,
                    };
                }
                return lot;
            }),
        };
    default: return state;
    }
}
function setTime(time) {
    return {
        type: SET_TIME,
        time,
    };
};
function setLots(lots) {
    return {
        type: SET_LOTS,
        lots,
    };
}
function changeLotPrice(id, price) {
    return {
        type: CHANGE_LOT_PRICE,
        id,
        price,
    };
}
function favoriteLot(id) {
    return {
        type: FAVORITE_LOT,
        id,
    };
};
function unfavoriteLot(id) {
    return {
        type: UNFAVORITE_LOT,
        id,
    };
};

setInterval(() => {
    store.dispatch(setTime(new Date()));
}, 1000);

api.get('/lots').then((lots) => {
    store.dispatch(setLots(lots));
    lots.forEach((lot) => {
        stream.subscribe(`price-${lot.id}`, (data) => {
            store.dispatch(changeLotPrice(data.id, data.price));
        });
    });
}).catch((err) => console.log(err));

function App({store}) {
    const state = store.getState();
    const dispatch = store.dispatch;
    const lots = state.auction.lots;
    const time = state.clock.time;

    const favorite = (id) => {
        api.post(`/lots/${id}/favorite`).then(() => {
            dispatch(favoriteLot(id));
        });
    };
    const unfavorite = (id) => {
        api.post(`/lots/${id}/unfavorite`).then(() => {
            dispatch(unfavoriteLot(id));
        });
    };
    return (
        <div className="app">
            <Header/>
            <Clock time={time}/>
            <Lots lots={lots} favorite={favorite} unfavorite={unfavorite}/>
        </div>
    );
}

function render(virtualDom, realDomRoot) {
    const evaluatedVirtualDom = evaluate(virtualDom);

    const virtualDomRoot = {
        type: realDomRoot.tagName.toLowerCase(),
        props: {
            id: realDomRoot.id,
            ...realDomRoot.attributes,
            children: [
                evaluatedVirtualDom
            ],
        },
    };
    sync(virtualDomRoot, realDomRoot);
}

function sync(virtualNode, realNode) {
    if (virtualNode.props) {
        Object.entries(virtualNode.props).forEach(([name, value]) => {
            if (name !== 'children' && name !== 'key' && realNode[name] !== value) {
                realNode[name] = value;
            }
        });
    }

    if (virtualNode.key) {
        realNode.dataset.key = virtualNode.key;
    }

    if (typeof virtualNode !== 'object' && virtualNode !== realNode.nodeValue) {
        realNode.nodeValue = virtualNode;
    }

    const virtualChildren = virtualNode.props ? virtualNode.props.children || [] : [];
    // const virtualChildren = virtualNode.props?.children || [];
    const realChildren = realNode.childNodes;
    for (let i = 0; i< virtualChildren.length || i < realChildren.length; i++) {
        const virtual = virtualChildren[i];
        const real = realChildren[i];
        // Remove
        if (virtual === undefined && real !== undefined) {
            realNode.remove(real);
        }
        // Update
        if (virtual !== undefined && real !== undefined && (virtual.type || '') === (real.tagName || '').toLowerCase()) {
            sync(virtual, real);
        }
        // Replace
        if (virtual !== undefined && real !== undefined && (virtual.type || '') !== (real.tagName || '').toLowerCase()) {
            const newReal = createRealNodeByVirtual(virtual);
            sync(virtual, newReal);
            realNode.replaceChild(newReal, real);
        }
        // Add
        if (virtual !== undefined && real === undefined) {
            const newReal = createRealNodeByVirtual(virtual);
            sync(virtual, newReal);
            realNode.appendChild(newReal);
        }
    }
}
function evaluate(virtualNode) {
    if (typeof virtualNode !== 'object') {
        return virtualNode;
    }
    if (typeof virtualNode.type === 'function') {
        return evaluate((virtualNode.type)(virtualNode.props));
    }
    const props = virtualNode.props || {};
    return {
        ...virtualNode,
        props: {
            ...props,
            children: Array.isArray(props.children) ? props.children.map(evaluate) : [evaluate(props.children)],
        },
    };
}
function createRealNodeByVirtual(virtualNode) {
    if (typeof virtualNode !== 'object') {
        return document.createTextNode('');
    }
    return document.createElement(virtualNode.type);
}

function Loading() {
    return <div className="loading">Loading...</div>;
}
function Logo() {
    return <img className= "logo" src = "logo.png"/>;
}

function Header() {
    return (
        <header className='header'>
            <Logo/>
        </header>
    );
}

function Clock({time}) {
    const isDay = time.getHours() >= 7 && time.getHours()<=21;
    return (
        <div className='clock'>
            <span className="value">{time.toLocaleTimeString()}</span>
            <span className={isDay ? 'icon day' : 'icon night'}/>
        </div>
    );
    return VDom.createElement('div', {className: 'clock'}, [
        VDom.createElement('span', {className: 'value'}, time.toLocaleTimeString()),
        VDom.createElement('span', {className: isDay ? 'icon day' : 'icon night'})
    ]);
}

function Lots({lots, favorite, unfavorite}) {
    if (lots === null) {
        return <Loading/>;
    }
    return (
        <div className="lots">
            {lots.map((lot) => <Lot lot={lot} favorite={favorite} unfavorite={unfavorite} key={lot.id}/>)}
        </div>
    );
}
function Favorite({active, favorite, unfavorite}) {
    return active ? (
        <button onClick={unfavorite} className="unfavorite">
            {/* <ion-icon name="heart-dislike-outline"/> */}
            Unfavorite
        </button>
    ) : (
        <button className="favorite" onClick={favorite}>
            {/* <ion-icon name="heart-outline"/> */}
            Favorite
        </button>
    );
}
function Lot({lot, favorite, unfavorite}) {
    return (
        <article className={'lot' + (lot.favorite ? ' favorite' : '')}>
            <div className="price">{lot.price}</div>
            <h1>{lot.name}</h1>
            <p>{lot.description}</p>
            <Favorite
                active={lot.favorite}
                favorite={() => favorite(lot.id)}
                unfavorite={() => unfavorite(lot.id)}/>
        </article>

    );
    return VDom.createElement('article', {className: 'lot'}, [
        VDom.createElement('div', {className: 'price'}, lot.price),
        VDom.createElement('h1', {}, lot.name),
        Favorite({active: lot.favorite,
            favorite: () => favorite(lot.id),
            unfavorite: () => unfavorite(lot.id)})
    ]);
}
