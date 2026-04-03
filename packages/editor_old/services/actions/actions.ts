// import Editor from '../editor'
import {VisionEventData, VisionEventType} from './type'

export type EventsCallback<K extends VisionEventType> = VisionEventData<K> extends never ? () => void : (data: VisionEventData<K>) => void;

class Action {
  private readonly eventsMap: Map<
    VisionEventType,
    (VisionEventData<VisionEventType> extends never ? () => void : (data: VisionEventData<VisionEventType>) => void)[]
  > = new Map()

  constructor() {}

  // subscribe
  public on<K extends VisionEventType>(
    eventName: K,
    callback: EventsCallback<K>,
  ) {
    if (this.eventsMap.has(eventName)) {
      this.eventsMap
        .get(eventName)!
        .push(callback as EventsCallback<VisionEventType>)
    } else {
      this.eventsMap.set(eventName, [
        callback as EventsCallback<VisionEventType>,
      ])
    }
  }

  // unsubscribe
  public off<K extends VisionEventType>(
    eventName: K,
    callback: EventsCallback<K>,
  ) {
    if (this.eventsMap.has(eventName)) {
      const arr = this.eventsMap.get(eventName)!

      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] === callback) {
          arr.splice(i, 1)
          return 'deleted'
        }
      }

      return 'Cannot find event or function'
    }
  }

  public dispatch<K extends VisionEventType>(
    type: K,
    data?: VisionEventData<K>,
  ) {
    // console.info('action: ', type)
    // console.info('action: ', type)

    if (this.eventsMap.has(type)) {
      this.eventsMap.get(type)!.forEach((cb) => {
        cb(data as VisionEventData<K>)
      })
    }
  }

  public execute<K extends VisionEventType>(type: K, data: VisionEventData<K>) {
    this.dispatch(type, data)

    // console.log(type,data)
  }

  public destroy() {
    this.eventsMap.clear()
  }
}

export default Action
