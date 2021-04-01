import React from "react";
import { OptionOrderType } from "../../types";
import "./Order.css";
import { useMutation } from "@apollo/client";
import { PLACE_ORDER } from "../../graphql/order";
import { emptyCart } from "../../utils/cartStorage";
import { OrderContext } from "../../context/Order";
import { addToCart, removeFromCart, updateCart } from "../../utils/cartStorage";
import socket from "../../utils/socket.io";
import calculatePrice from "../../utils/priceCalculation";

// interface OptionOrderType {
//   optionId: string;
//   price?: number;
//   name?: string;
// }

interface ItemType {
  itemId: string;
  name?: string;
  price?: number;
  options?: OptionOrderType[];
  presetOptionId: string[];
  seatId: number[];
  cartItemId?: string;
}

interface OrderItemType {
  itemId: string;
  name?: string;
  price?: number;
  options?: OptionOrderType[];
  presetOptionId?: string[];
  cartItemId?: string;
  seatId: number[];
}

interface SplitEventResponseType {
  splitBy: number;
  perSeatPrice: number;
  item: ItemType;
  presetOptionId: string[];
}

interface RemoveEventResponseType {
  itemUUID: string;
  seatId: number;
}

export default function Table() {
  const getCartData = () => {
    let data = localStorage.getItem("tablewise_cart");
    if (data) {
      return JSON.parse(data);
    } else {
      return [];
    }
  };
  const orderContext = React.useContext(OrderContext);
  const [placeOrderHandler, { loading, error, data }] = useMutation(
    PLACE_ORDER
  );

  React.useEffect(() => {
    socket.removeEventListener();
    socket.on("split_bill", function (data: SplitEventResponseType) {
      data.item.presetOptionId = getPreselectFromContext(data.item.itemId);

      orderContext?.setItems("ADD_ITEM", data.item);
      addToCart(data.item);
    });
    socket.on("item_removed", function (data: RemoveEventResponseType) {
      let index: number = -1;
      let length = orderContext?.items?.length || 0;

      for (let i = 0; i < length; i++) {
        if (
          orderContext?.items &&
          orderContext?.items[i].cartItemId === data.itemUUID
        ) {
          index = i;
          break;
        }
      }

      if (index > -1 && index < (orderContext?.items?.length || 0)) {
        let updatedItem = orderContext?.items
          ? orderContext?.items[index]
          : null;

        updatedItem?.seatId?.splice(
          updatedItem?.seatId?.indexOf(data.seatId),
          1
        );

        updatedItem !== null && orderContext?.updateItem(index, updatedItem);
        updatedItem !== null && updateCart(index, updatedItem);
      }
    });
  }, [orderContext?.items]);

  React.useEffect(() => {
    if (!loading && data) {
      emptyCart();
      orderContext?.setItems("EMPTY");
      alert(orderContext?.items?.length);
    }
  }, [loading, error, data]);

  const getOrderData = () => {
    let cart = JSON.parse(JSON.stringify(orderContext?.items));
    cart.forEach((item: OrderItemType) => {
      delete item.name;
      delete item.price;
      // we need it later
      delete item.cartItemId;
      delete item.presetOptionId;
      item.options?.forEach((option) => {
        delete option.name;
        delete option.price;
      });
    });
    return cart;
  };

  const removeItem = (index: number) => {
    let item = orderContext?.items ? orderContext?.items[index] : null;
    if (item && item?.seatId?.length > 1) {
      socket.emit("item_removed", {
        itemUUID: item?.cartItemId,
        seatIds: item?.seatId,
        table: orderContext?.tableNo,
      });
    }

    removeFromCart(index);
    orderContext?.removeItem(index);
  };

  const getPreselectFromContext = (id: string) => {
    let item;
    for (
      let i = 0;
      i < (orderContext?.items ? orderContext?.items?.length : 0);
      i++
    ) {
      if (orderContext?.items && orderContext?.items[i].itemId === id) {
        item = orderContext?.items ? orderContext?.items[i] : {};
        break;
      }
    }
    return item?.presetOptionId || [];
  };

  return (
    <div id="order-container">
      <div className="order-banner">
        <h3>Bill: Seat #1</h3>
        <button
          onClick={() => {
            alert(orderContext?.tableId);
            placeOrderHandler({
              variables: {
                tableId: 1,
                items: getOrderData(),
                uniqueTableId: orderContext?.tableId,
              },
            });
          }}
        >
          Pay
        </button>
      </div>
      <div className="order">
        <table>
          <tr className="order-header">
            <td className="order-items">
              <h4>Item</h4>
            </td>
            <td className="order-rate">
              <h4>Sub-Total</h4>
            </td>
            <td className="order-remove">
              <h4>Edit</h4>
            </td>
          </tr>
          {orderContext?.items?.map((item: OrderItemType, index: number) => {
            return (
              <>
                <tr className="order-row">
                  <td>{item.name}</td>
                  <td>
                    $
                    {Number(
                      calculatePrice(item, getPreselectFromContext(item.itemId))
                    ) / item.seatId.length}
                    ( <sup>1</sup>&frasl;
                    <sub>{item.seatId.length}</sub> )
                  </td>
                  <td>
                    <button onClick={() => removeItem(index)}>X</button>
                  </td>
                </tr>
                <tr className="order-details">
                  <td colSpan={2}>
                    {item.options?.map((option) => {
                      return option.name;
                    })}
                  </td>
                </tr>
              </>
            );
          })}
          <tr className="order-footer">
            <td>Total</td>
            <td>$ ??.??</td>
            <td></td>
          </tr>
        </table>
      </div>
    </div>
  );
}
