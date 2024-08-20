// Data store for maintaining the state
const stateStore = {
    numberOfFloors: 0,
    numberOfLifts: 0,
    scheduledFloors: new Set(),
    floors: [],
    lifts: [],

    addLift(lift) {
        this.lifts.push(lift);
    },
    getLiftList() {
        return [...this.lifts];
    },
    clearLift() {
        this.lifts = [];
    },
    setLift(liftSet) {
        this.lifts = liftSet;
    },
    removeFromScheduledFloors(value) {
        this.scheduledFloors.delete(value);
    },
    updateLiftStops(index, distance, floor) {
        if (this.scheduledFloors.has(floor)) return;
        this.lifts[index].direction = 'running';
        this.lifts[index].stops.push({ floor: floor, distance: distance });
        this.lifts[index].stops.sort((a, b) => a.distance - b.distance);
        this.scheduledFloors.add(floor);
    },
    toggleDoor(index) {
        this.lifts[index].door = !this.lifts[index].door;
    },
    addFloor(floor) {
        this.floors.push(floor);
    },
    getFloorList() {
        return [...this.floors];
    },
    clearFloor() {
        this.floors = [];
    },
    clearLift() {
        this.lifts = [];
    }
};

// Lift class
class Lift {
    constructor(id, stops = [], currentPosition = 0, direction = 'none') {
        this.id = id;
        this.htmlID = `lift${id}`;
        this.stops = stops;
        this.currentPosition = currentPosition;
        this.door = false;
        this.direction = direction;
    }
}

// Floor class
class Floor {
    constructor(floorNumber) {
        this.floorNumber = floorNumber;
        this.htmlID = `floor${floorNumber}`;
    }
}

// Generates up-down buttons
function generateButtonElement(floor, up, down) {
    const div = document.createElement("div");
    div.id = `b${floor.floorNumber}`;
    div.classList.add('btn-container');
    if (up) {
        const upButton = document.createElement("button");
        upButton.innerText = `UP`;
        upButton.classList.add('up-btn');
        div.appendChild(upButton);
    }
    if (down) {
        const downButton = document.createElement("button");
        downButton.innerHTML = `DOWN`;
        downButton.classList.add('down-btn');
        div.appendChild(downButton);
    }
    return div;
}

// Generates floor component
function generateFloorElement(floor, up, down, index) {
    const div = document.createElement("div");
    const buttonDiv = generateButtonElement(floor, up, down);
    const para = document.createElement("p");
    const liftContainer = document.createElement('div');
    para.innerText = `Floor ${floor.floorNumber + 1}`;
    div.id = floor.htmlID;
    liftContainer.classList.add('lift-container');
    liftContainer.id = `lift-container${index}`;
    div.classList.add('floor');
    div.appendChild(para);
    div.appendChild(buttonDiv);
    div.appendChild(liftContainer);
    return div;
}

// Generates lift component
function generateLiftElement(lift, index) {
    const div = document.createElement("div");
    div.style = `position: absolute; left: ${150 * index}px`;
    div.id = lift.htmlID;
    div.classList.add("lift");
    return div;
}

// Initializes the floors and lifts
function handleCreate(lifts, floors) {
    stateStore.clearLift();
    stateStore.clearFloor();
    const children = [...document.getElementById('floors').childNodes];
    children.forEach((item) => {
        item.remove();
    });
    stateStore.numberOfFloors = floors;
    stateStore.numberOfLifts = lifts;
    for (let i = 0; i < lifts; i++) {
        var lift = new Lift(i);
        stateStore.addLift(lift);
    }
    for (let i = 0; i < floors; i++) {
        var floor = new Floor(i);
        stateStore.addFloor(floor);
    }
}

// Handles re-rendering and creates lift motion
function handleRerender() {
    const updatedStore = stateStore.getLiftList().map((lift, index) => {
        if (lift.door) {
            document.getElementById(lift.htmlID).style.transition = 'width 2500ms';
            document.getElementById(lift.htmlID).style.width = '60px';
            stateStore.toggleDoor(index);
        } else if (lift.direction !== 'none') {
            if (lift.stops[0].floor === lift.currentPosition) {
                document.getElementById(lift.htmlID).style.transition = 'width 2500ms';
                document.getElementById(lift.htmlID).style.width = '0px';
                stateStore.toggleDoor(index);
                stateStore.removeFromScheduledFloors(lift.currentPosition);
                lift.stops.shift();
                if (lift.stops.length === 0) lift.direction = 'none';
            } else {
                if (lift.stops[0].floor - lift.currentPosition > 0) {
                    lift.currentPosition = (lift.currentPosition + 1) % stateStore.numberOfFloors;
                    document.getElementById(lift.htmlID).style.transform = `translateY(${(-135.5) * lift.currentPosition}px)`;
                    document.getElementById(lift.htmlID).style.transition = 'transform 2000ms';
                    document.getElementById(lift.htmlID).style.transitionTimingFunction = 'linear';
                    lift.stops[0].distance = lift.stops[0].distance - 1;
                } else {
                    lift.currentPosition = (lift.currentPosition - 1) >= 0 ? lift.currentPosition - 1 : lift.currentPosition - 1;
                    document.getElementById(lift.htmlID).style.transform = `translateY(${-135.5 * (lift.currentPosition)}px)`;
                    document.getElementById(lift.htmlID).style.transition = 'transform 2000ms';
                    document.getElementById(lift.htmlID).style.transitionTimingFunction = 'linear';
                    lift.stops[0].distance = lift.stops[0].distance - 1;
                }
            }
        }
        return lift;
    });

    stateStore.setLift(updatedStore);
}

// Calculates the relative distance of a lift from a given floor
function calculateDistance(currentFloor, calledFloor, finalStop, calledDirection) {
    if (finalStop === undefined) {
        return Math.abs(calledFloor - currentFloor);
    }
    if (finalStop - currentFloor > 0) {
        if (currentFloor > calledFloor)
            return (finalStop - currentFloor) + (finalStop - calledFloor);
        else if (calledDirection === 'down' && calledFloor > currentFloor && calledFloor < finalStop)
            return (finalStop - currentFloor) + (finalStop - calledFloor);
        return calledFloor - currentFloor;
    }
    if (currentFloor < calledFloor)
        return (currentFloor - finalStop) + (calledFloor - currentFloor);
    else if (calledDirection === 'up' && calledFloor < currentFloor && calledFloor > finalStop)
        return (currentFloor - finalStop) + (currentFloor - finalStop);
    return currentFloor - calledFloor;
}

// Handles task assignment (which lift goes to which floor)
function assignTask(floor, calledDirection) {
    let closestDistance = Number.MAX_SAFE_INTEGER;
    let assignTo;
    stateStore.getLiftList().forEach((lift, index) => {
        let distance = calculateDistance(lift.currentPosition, floor.floorNumber, lift.stops.length === 0 ? undefined : lift.stops[lift.stops.length - 1].floor, calledDirection);
        if (distance < closestDistance && (lift.direction === 'none' || lift.direction === 'running')) {
            closestDistance = distance;
            assignTo = index;
        }
    });
    if (assignTo !== undefined) {
        stateStore.updateLiftStops(assignTo, closestDistance, floor.floorNumber);
    }
}

function addListeners() {
    stateStore.getFloorList().forEach((floor) => {
        if (document.getElementById(`b${floor.floorNumber}`).childNodes.length === 1) {
            document.getElementById(`b${floor.floorNumber}`).childNodes[0].addEventListener("click", () => {
                assignTask(floor);
            });
        } else {
            document.getElementById(`b${floor.floorNumber}`).childNodes[0].addEventListener("click", () => {
                assignTask(floor, 'up');
            });
            document.getElementById(`b${floor.floorNumber}`).childNodes[1].addEventListener("click", () => {
                assignTask(floor, 'down');
            });
        }
    });
}

// Creates UI elements for the floors and lifts
function createUi() {
    handleRerender();
    let container = document.getElementById('floors');
    stateStore.getFloorList().forEach((floor, index) => {
        let up, down;
        if (floor.floorNumber === stateStore.numberOfFloors - 1) {
            up = false;
            down = true;
        } else if (floor.floorNumber === 0) {
            up = true;
            down = false;
        } else {
            up = down = true;
        }
        let floorComponent = generateFloorElement(floor, up, down, index);
        container.appendChild(floorComponent);
    });
    stateStore.getLiftList().forEach((lift, index) => {
        const liftComponent = generateLiftElement(lift, index);
        document.getElementById('lift-container0').appendChild(liftComponent);
    });
    addListeners();
}

// Initialization function for creating the lifts and floors
function init() {
    const button = document.getElementById("create");
    button.addEventListener("click", () => {
        let lifts = document.getElementById('lift-input').value;
        let floors = document.getElementById('floor-input').value;
        handleCreate(lifts, floors);
        createUi();
    });
    setInterval(() => {
        handleRerender();
    }, 2000);
}

// Start the simulation
window.onload = init;
