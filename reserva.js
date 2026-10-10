/* Vamos a La Paz — customer booking page (/reserva?k=<page token>[&pagado=1])
   Source: github.com/vamosalapaz/vamos-portal (reserva.js), served via jsDelivr tagged releases.
   Shows the trip, the price (IVA included), how to pay the deposit (card via a one-time Stripe link, or bank transfer
   with the booking number as reference) and the cancellation terms. Once the deposit is paid it shows the captain's
   name and WhatsApp (Save contact, Copy number, WhatsApp); the server only sends those after the deposit.
   v26: first release. Never calls the booking an invoice ("Reservación VLP-xxxx").
   v27: quick payments (Kind = Quick payment): a one-off amount with a description, e.g. an extra hour ("Pago VLP-xxxx").
   v38: "Pagar con Mercado Pago" next to the card button (Checkout Pro link made by Make; hidden once it expires);
        an OXXO payment waiting to be paid shows as pending; Good Medicine payments are co-branded (Good Medicine logo,
        "vía Vamos a La Paz") and show the Bókun booking; every page ends with a link to vamosalapaz.com (/es in Spanish).
   v39: quick payments with several lines list each line above the total. */
(function () {
  'use strict';

  var HOOK = 'https://hook.us2.make.com/vrn9xcbptiqnnl1aniuccma1j8pxjtgx';
  var VAMOS_WA = '526122194779';
  var BRAND = '#B51E66', INK = '#061A2E';
  var C = { foam: '#F3EFE6', aqua: '#00C6C0', pacific: '#156AB3', gulf: '#0B4F6C', lima: '#B5C62E', orange: '#E65A37', gold: '#F3B53F' };
  var LOGO = 'https://s3.amazonaws.com/webflow-prod-assets/6a94d97df3061a3b48890971/6ab313cdb43ef771290ceace_download.png';
  var qs = new URLSearchParams(location.search);
  var TOKEN = qs.get('k') || '';
  var JUST_PAID = qs.get('pagado') === '1';
  var MP_PENDING_BACK = qs.get('mp') === 'pending';
  var GM_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAjAAAAB1BAMAAACi1caqAAAAMFBMVEX8+eT18d708d/08d708d3z8d7y793n5taHkZkqQF8fN1geNVcdNVccNVcXMFMPKU7ISq2YAAAfaUlEQVR42u19fVxUVf7/+9zLg9rK3EGFWp4u49Mu7ihG7Zam5iq7AWJqoYCRaDEq/tqUMmZoy4c2GNxvpvtdJxx386EUA0uylPpS/b6ym+2Wo5dxY1NzGAYwxWTuQGVAc+/vj7nzyMwAZbmvX9x/7nDPvedz7vu8z+d8Pp9zPhdyEkOHv4MagmAImCFghoAZAmYImCFghoAZAmYImB87MCbTEDD+jo7UrB8zMiGBCoTxr9gK3mOHgPE9WiL+sYffZBwCxpcwU/c1qrZOGPmjpUwgHdMyojTOkHNu/o+WMcR/oEoYva+FA91Q8aOlDBWQMBxg/xFTxj9jhHGbuzigH8qITQAimR8TMJY7E5QAAOUtAScmE8YmAug49W2x6eABKLyrBACK9bmgCF6P2CQ91LdCz2oU1wEYJ2GCUEZsSmWuHAYQskL81PitFNEoFsAF3tN0YgDgisV14XbA5x4/R+dsAMJpiKMYF5bebR0LAKeY7w6M5edTlNLPAJQRWhbt5K3iLixmiHxC5muKweNiaecBjJG5QbWcAwBERbCBLvgd9gm7AVALbY5XSQn0jr+2fWc7Rpj1TB4n/W6s9GvLtM4rv7QN8nFClRWk+POHXvsWnPlaDZC/er7A1xsBYIOzU4TpiwAALwavh1EDWA1YPmuuob5oM/ftgs+aa0I7O43fGZjWkTpn22DPOeeHMk3zt2qiVBBPIZWBXRvesdwyeGDCVIBPL6oAYIvNKVAWlg+A9FMPP+Fu9DIAQCnoBv9zr4IerA0fEpww/ikjzNmqUdkNAHABgKrnqbC4b0GZV1m6+bdeV+wcQAuuDvogzwBQll/1U4/VAOUP4RJ4EsY/ZdoMJSqD+08DnXsdW2TP2S/1BLH+Rxl4wqydeZ5/N27d7zNsO9L+WWDwepfr2yZJnDDtv7n/JGBa23Wcdw/6mr9fao8ZnGP3e2hS4xZJnqxrkE/SKcmDLBjEUPLWMP60jJC2xHFHCj56Z3wyrpqvMzKCU8UMVnPogfBABcO+KzCtdp3Sd9B7a5m2Y/kGALRSj19mfahH1ALDdcXFqWSINXlQQ0m8WQvAjzEoDtMChP9uwAgz/5Dn2xxvygjp9+cDwKR9ajmDFKt4dldBz3VWMkoAwrSHBzfTxc5mAPjppNiFAMRBmloh/RLGlzItF2gOQMreP6gYKwjT++JETf71VTKv2IzfQsVQdQFcIqr6W/hKIf0Txocy1Nk8DqCrNq8/5FBsS0agfMr1VzKDVzGKQRcMHJjWqzqlv1Hvpoww7UgngEmW9YckeXUhxczXrncyk0STp4MMmEAlNHk1zgRKCBxtlpRMXxXjqFvheQGsGQl+3XXBjMgO6U+ndy2dTVB4VtOnWj/ACDOezfOn8DwpI9uvBKjTxU5coBAOrdwtlZrGZVmtqcyVeo/QQSrTYRsnO2lhPa5YIbceDKpk+qoYoTVLNI+VnaQ8L/DjIz536tjbGUA8JYH0RZbIQy4eUgBiKgOI7zFwnIXbE5pSZS6VI7RmiU2pzHmfEIE3MK0XdEr/feiiTNduACCfrDF6eCKHZjl0vpDaXm4FYaKXHnGKMWXt5K0g8sWs050SUl/hrZBH96NkfFWM0JZRbgWRq85LyIitGeUiT+Rr+XhH+KEKAObwjgjGiHKRh1yuusBLBYuaSRUAfvmXb1t5Il8ntdBZy4TJnYGBEe4qzfM/Q7op03k5jwOS0o54AqwwM462nzr7PACoX55ncaKw85NtAIh14iTHCwlfvvLJNgDq+AA6VAAEoPUfSoD2sKlbM7ZqABDrSoNDdHPmcyUAwsUIKS7z2TaehLXxAIQ206ktABBuHZ/gKAhfjuZ/bwOGrTd9sg0ID8twAGGZt1UDAGre2yUMGQhh+toyDTN9XH/H89O0/60CgIpr5CbHSGs7tSpKBcCuVd/rWL5rnbb8KxWAisX+589PFbDn7B9JdyRz6HUb5kJG2SYVAGiJoyXCr7UbVQB6n3Z15mJgr6Mh6ertKgDoVT8vssBiYJ/kve/rPahTAb2a+WYWgDDDUQu06s1efR0yIMIAjQckysQfB0D/6wE/brwwvexAviEFdm5xz86/17AAOtJWqexcMuycqsLxQsJduqg4A4DF1X4nC+Xc55UAf9OMh1lQrelGt+Na+rCBToZBpY2KYwG0Gv7wsAEAvZRzO+e09CJa3QoDAND5XgV2jsZfdXkGgM5+faaj2s0FUrXR0wMxJjBhAHuugzJCAkGgGEmbQZfHJesRlmegz/1phuRWxWGyHlEzDIsdy3ct9tJMM+hk2ANMosShZIQuIGbOc5NdZuXKvFP0JD0pMKzQdBoB4Rf1D54CUvyZdK0GZw/7cW/P5SPFAHvjwU4jIEwryzc4qlVpvEJZIQMjjAdl9rFATArvmhRdAWxhWlkeR79YjG6d0r64pNMouVX0gWJ0H4gz5Hy43QhQb+dxoJP0iMr0L4yssZghfvGSEmDkxP2uB5RIOlCMLSvOZO+IY4F4nRJI0YMU+CIjvQidbJWjp49OOJC+ByoDROXLESxaDTolJh0oxpYVpx3V+gGGsuuCmFT23HPrLE57VCaXQm+jx7kj9V0dOiWS5hQwdejiDNk74liHW5V0/8Oo6k3mGhvmiqyQtkQJJFVqcSmAtLBwBvbs163JHBrudLk7k/+cx9GVmwt6ZRuV5NxSC9qO5XGg9WpGLFnhi7CgUwJ0kl5uRR+b/F+ZL2vFkhWcoLRFAORyHkcf2FzQy2xQflViM/oFpuXNvGBOW+PBTe74ZUgDCwAtdRJzyGYjOv+WxwFRJzFh8hQlyLmlFmHacTvoys/ewZLLR2DPscSh6zAAuvKZ9di5ptO/OPkbANq3K0B/vOwRJzCxOiWS5jz+6ujHzlNnjNstQtJxAElzVGwPno/zGdLH8jggqVIrF619bXJDaRF6t7PAlUxeSFuixKQ56w/RRZe7zgiWADomuP8pyl52R+vl0rm73HEethnCtCMU6IP6eqb3p2s6uY+N2y2Q6ZQA9RMF6oqfVeLM2w2WzrN5HJLmFlXjt937/Mr5ZuV6JRqiv/TSZK0GGcDPek0hHEtosWfvHxmfoFOCrnzr/Ed00dPewAjT6gHQlS8st8oF+TXfkfrJ76rxxB+AM8MjeKoJgBh1SCEcY7rsOW94jCUPYBL6cWB+6u+qynHaJ5nEdjnPgDoh64QY8XIEZWCApJwjLFjbGouZtjIWkQfo2rIaBU6HmtmA2pfamcch6R73tcvzObq2yghq5MRSJfiRlBXApDmTLJECz/hUINuhBJKyH6gGqJV/9RGSlFOjEGxLjaB3b7e0NORxdOUWC6iYOxKUsMb5jeA19+O8XvSMP7tUj8FgMBg4APRhAMqCesmsEdJtIJcznQ+fkDGA+EbHdBsH2B4IEgKgjhYmAxM4AHIXh2U8AAKTydSxECDtMy1VSkCMqvdXQRMA+uCjRxQKBVt9t08srzKegLLJPCJ6hDGZTGY5cKZupv+hxAT184ntAaOL3t8k9xl3ze1K5xgTw99wYU/XznTPCJ122X4lepcHHbSE6QLsAF1Z6OSCMOklI0BCsgCxB/i4chOxJnNU7Ux/z1talEDMnKush03uUXumEfiXpB2SjsNZbS9An2Ys/oCJuyMhmKOf5PBC+KWdZjQMj+jzbh7ecPzP+TjgSkbncQD8fHfok78JAKaMMTJBBMXdPMvRDpLsWkmR7VfCPnmLQ9e5JPLz/C1nEWsyB1mU5McGkyQyL7GwRziqVQb0rgW6sCvwtERXVtSzAGWTUUDo7u0WZ5jZzvVxFQQGABEZGQFAHK4M0+Ix7/DBmitMdfaE2dud6lYDAO4zu7n1Ldb5vLRRF4BbHNWmACLv3475+6+WKYMQZqkRAD5muuBRhR6hkz2qaHFPWtwdAO/yWEUp5jqQpaJmqYOiOG9gwhya3gB4v4O/o2HmgNHxqLbT//JJ7JzC5MCEmXDEK5RkluLP5U8m+8wozppr3EtE8P7Zj5ZvZACAqpX5L09JSRaDUg4A1TZo9qSkJKOB96t8g1HGSRiI0TviAdK+1OKIP/N7WzxHrcdvFgDrhoMdMDKSCNsDPgP73IfOX+H92FwQBoFIj95dbYCwQ2xiIC1DV1ZITnls+qMAPj5QYGYBqg4hnk0U4tyzefzNAOPiJhEZL8swaLg//VEA9qk+L6/8jXuS7+yvjnQyUFyEO1Z7aGP/wFB/WzJLGZwwgE0JwJ6za9MRFlCgxbvxBAAoHoCM4SEyLm0wmGUdmxKAckq9t4qx3VLgfFvxFGH6WUPgRw5AEAEQulfnrjZQaDNW4Z8ybsKAOpHZwgGNlVGPvAYi40Nd0w3T4myP5TIDINToUGB/62NSX8kMCpMkgvF5g7badf/rHfcXg+zt4OMGAAy/xmKG+E2Nn+UEb2Coev+U8SAMxOhSJWDP0fzkYauVyG8qdV53W3WkO5MD5CBMF+wym9P0p2pnStGWjf3wh7mYgr1bLILbYins4gBGargw7j0agD33jL9NTWL0jnicebvZ0WJzMCP7fQel3dWyfmclALHj/U1MXlNS7HIkA2jM/j/l1e/UVT1Xyjmv8wCuJLvGDQNRzgHpNgDCNBsPws9LNBcmA0I/AytmiV6vJx6MIScYQIx42SyFxatnyqLfCDRnx+bbALrj72YAgnl2cCMbsOccdVeLQMBQ9Stf8kOYoqUeUNaWUADsjTnqp02mDzR5XqG3rfGAMIkH6MpMNnbxGQAd8QBkO8wAYUgjA9hzdnSYTKQ3cF9SWq12s8UnqCykm2cCgKntztPMT5bzQKNmvslkltn8aA57zjsLTCbTF4sOBTV9o2oAnJvJAzC1pTUxARfcEBvVV8t4aBgAiEmLyOMAe6Pqo3IyxrWDiDpa2MVBtv8m0JN1SofFGwmg8eDGVxFqYICke4wQI98AujTXrGS4JuCaPfV+sWN3lVvmPTIlGg9OncQBqT1le/8EGwOIw3c8ysu1jK8dVNjFobGSWQ+0l1sW8sHmv7VAY+WE6RyQOqK4YnNgYKjjK6cog2gYAKS2RBcHwG4IUeGqR1xxwsY4e9q5UnzzbB6HpOwjLHWspIWzZz+3Hj3FmRzNzzKzsemPK9Hys3K5eGl/YPUYWw3v1Ux0jkzm7Nn/RBZE/Sc6GtSJwhZOWKAZgY4+Ebxm9mPAnvOUAFx5ThN8/ivs4uw5Z5EP7PxERwVeovVHGR/CgPSqt6UYAECQUKGTUnggNn1tJte4VwaxVAm6ciaAiN/OUqKxUkC3TonkfVVGqSkT1Cu7DwSJF/bZkESdeOQi0LhHfRbiZV3+S4AYrYvDx9mPrN2i8o35xqRFZJrRmKMG6OXBDeQT7AGgsWZVOXBJl78vGDB9KeNDGCCxtqzQMwJNTzpQUc+Cqi3RxdlXqIGHODppzjwLMDKh8CuDPUcNOp+jPyw7woI6wZbG4YKqKjRvUAZ7TNrIBzm7SgsgKg8iEJtRmMnZG5fuUvXBl6otuWiGvVEF2IX+ql23grMvruCBqDwbggHThzK+hAFITCZfUuDaSJXSc+DZDAuAmLRtKQZOBRjoSQdeqGcB6v2JhQWGRhXsHJ301pp6ADFpG289BUOqnd516yCAoWqfLM3jDCoAdrpqHQ/q2IbSTLP9X/dzP23pE7hXD1MZYDcAmNxftc9uzOMMiwHY6bfX8cGA8aVMH8IA1OtF0EQtgAEYy9j14ZvXHWYBULVlq1W4aqZSevdrHaGS2LutTxaIBoxN6amseD3RcVNhwVVz01R92WnGd32KTvFd70hxWl0x6bwuXzSAmkrr1QX1LGLS+QP3nhJI0sEHgV7n4w0AEF9bplHBAKTg3FvrHAVGeJzdv2LS213VrhpfzwYBxocyfQkDIP5oES5vI5H3Xf0fnqgjH3810dH4WbwGYxZ+pA9/5nc1LABQ7z1GNOT2KdV8eFmGRXpDa0nUgl69engVQK/0qlcP4ClfB4/8FgCoY3dgmzwLH+mhnvg5C1DHfpb+lwJUXfvTSgAa6fFwAKBiMqAhYxbYq/iV6Z1w78FznonrF3VUjW0ki/lID/XEDEswxvhQxg9hABJ7tFhfxrfr5SuJfMJ8544Q6t1ieVO7PlotX+/cZcEeLSLWnR+p5BPyXndcot58jFzeFq6e+HWx74pmeLFPyM1W7A5lxIyRR1u3IKo4csJ0IwMg5m5EbUHxqHyTwzkVo8t44jAdqTcekzdd1pMn5FHLTkMML+MJAERrARsPQIzWOr232A800VY9H1Usj87wIIzfJAth7DMuygRKPxHMqbJqHiBZsk8bEl2XTak9NUDUva7NMxBaF/6PGVh8k4t3QuuCXVb54iuhLCCaPIa1OI4BvDaBds6G+56OMVN2ARiz0LmVxZTac9g2ZlnNIsdT4jjG5QeKlkXtNUDo8iv1rFTwHoOx0tl9BYDw5axdAEKXe++Q8Z99Mi2+n+wTACbcxsit4rs+KUchd8utn3Ne255uk8v4dzzMEsGcyoiHIiPM8Jev5Gm/iE2erp1gniuH9XPOlR9lGj0bV44nmtA3X0lsCpnNiB3vUSz67KiCdwaTYL5NznhWGxgYR0ZkMMK4Fq5Jop+Liv4umb7dvjiY4J1SJ5h97EAfqRQ7oGo7+L6ZegEy3JyUCZLh9v/5Qav8XR0ZGjHiEgD6nWVm5oa2T+SHO9f4uof9kIIDpBc3T49XDo4wgrnPqPLDbQwuu9SEsYzBMSAo1qFwbjAwg867FkezkpYPeIxiAUD0nMT6wyVVdtLs2ANKrvxfagCdZBqoWvm2wKB5enymeRCEsZ3nSfA0N3LeDADysAcPD7Dt5kV6Kw/CRD94mCXtacMGkLw3lvm8+fsFRhi971jy3oEn6lssa4fbgjbccqkQAMKKItfWD2g0CSlbXuGIjIc68rHTpP1e2mYcwNuExl8fpRhofzZ1epVZr1k68CkpTPVSf62OWgAA2vDQ6QManG0GjWrqbj5qQcU1LOz0XrMKcDT/e88G/vsFBnHX7vh5wZGBD1iR6/+enj0AVD2aVvNAKkwbpqq6Vozubaqep9eeGWAzFlwv5RsQGOr8Etmh65zAdlALiOWLs18aSGpp27HFPasSUyNeLdOoboCdEDjVIbIO1z2xrxgQ5Y8sLOlfW0BIW5K3/4VlJ09lMUxh+H8SMN8FFslk6VNDbw2w5NJFgZccG2lyNfmR2fpB8tWyjEMK9h2s4jc5q6UE51pbk8f9gpliIZjBAoAgTdmCmSSYHfU7yxUY+HceQr4XuFtSGdHGiH2HogKoK5YlvxkRPy4RVsJ8fpwFMNdV7vEBhqbkfVVHFIAC1UVS0LE1q4OS0kYsnhJGjxObhNa5MM+uB+Y6+kVozbLytzvSYEaPE5s6vpgLE9CcBZ4RD/Vv7XwvwJC7XuFFG0PW+0u3YwmSbBFfNFXBSpioB+oZ2KpdhYucVoiQkZ1b/LrDFFQcXWgBgK6MciuRr6tnfCSQj3hy95cZe3B3FdBTDZBbgZZ55VbIo+ZZpPJRI6oxijXP38lb5UT1TfONAEaMeLGcBxCGdf50iU0JCElbtwBAtC2jE52fve4YeiFd7qC+iIaZzjBWLM0TAD/ZqgHCQ2cCIiQJ/CYj0Hz1yeysjqfbQ8Q1DPs6IK6ebRMcSSXRZCSL5ksbVqf+83R76J2muc9pAIRZxycwN2QoXV6MamT1Fvv/ssFMK8BsU9lfo+7r0TxoYYDbbwcAg8cHGFoNzL9diRxUhxwA2fp7FdBb0mkEIi4vRjVSR5Y5Ei4oDD+4PWsE6LvNWY4AcJuhZPluRKVpLEYgNBG3/GN7QQ8ve0WjquKjMrXP8zcGGOhDi9Cte0jj14rnAaBXH61CeVT2vjgGvGPrzkMexgq5vMBjlUcOAJNLlu3K362Stvzr6cfRvUOSIECry99zL3rqWT0ADYT0JY++oMUl3QgpQUCry981ZVZMvWrXE+jettYad2OUL9RyuYx/cof4kh/KMvtzATFsk1wuVnzyVYnNKP5M6+CZtDFUmsF8N712LxumZSZsyLXOcEn4/Q5pu7pQ2hP2RLdNe4m/XwQo0nryGHlmPT6ErX2pBTA7yq1TZtykHX93dZnm6Rs0K92ikln5yOGb8zr9UFbEsZmwPbPeaiXygxtEIG42A0DsiZBt8QhHi3IfnzT5rbJlvLz74h9/b3RJ+FOmLQJASNWIokSGD8tfh7B8BsJpnMv96WPVGD/xUWqTBaD0I4oSGT70RaZz/afvpsbj6xsCDOlc/w5PGEPoU35Mf6HtJGObZ/ngsWrIRX75o8QIUgcAoQ35+9y+mYxHiM/WllptxiGEROlEgHSuP2kmjCH0EUnCvTcXi9bI3sMA6gAqPj2bVB5WoHfFo+IbMke5YJPze9PjDikSPz1V9OcbM13jkELeZAUA37FsQkhG8YJ9jCXmsEIwAzYZZYxgFQCEKSvuLXP5ZmJs3+16nUuPKCDcuZZySFCY3BLIwco6MAaKkmxGwQoyzwhQRwv5TpEC/dYLdWD4UIBQQGTkm49yNwYYRUdXKgO+wXdjdmgW2rfqcsuOsBRrGpcF9DxwwDUNfVn5X5zHePMzBFm44JIkNENkAfQuzzACkXAOvtaTSek1ABDK8PxIIOae6RYgsgWkd35NJIP4mhvEGGF8zG4rRJsvMOWAdUvB3vkC0JR1bicP6xcSAgJbn3uLMKCIgeghod1rpnMP5vbkMVkAAO9PMzEXt05Y9ilHseyNUb5Cm6np7B5gVKb39Ww1QAr0mrssEO7b2VQO4HZnWZLupq0eqpcMTAIdcM/E5fK+gMXd/ETu2T9OyPLMl/9BgWmZrt1eMPV0n924jSrgQ716/Xss2gyrw1RVPMzEGWTwVL0gXcH3XbZM125TTT0d+DvNYVrp7PmVKGFqb1jFV0VnozMsNwQYQVmhW6Yv/o38a59ZqVePUQ9nR59kIaQNU+n3rCPMuTcdj6QXzSrzDItZAHvgbhWTK3T5+uLfyLv7Wzno2fO8R4ypdtOGArsWasTKbwhjIkpz3yqX30/2+lz/906AFJzvBNqOqarUiSGLRqidqret8r/+10sd2K7GB+xXMaY0t9afBDcgasaPGo9JD9UQFSq+brkhTmTbsfy9Fcusn7byviUFxCpWUyyEaUewqlhmqpNSOUWmPvcWwZsh7tSfABLyO/xIcB3Ra500NbqroY4WEetOW0HPy/3GEL8XxvA9RUsPkcS+CvSbGhAFAMj2M+V1iGSlbhWn3RPztJdGFKN0QYPfPUVLq0kiCTyNic5YhlfoJfZocXuidcOyLQ2WHx4YMek4oo4o+okKdi41upNEfFQvgNg71053fg8PQpd3ho44KbAE52H1m7BExVaHLBnRfdHabwrY9/APG0TGBlk/ToN3PpeQ3txTdsT7FjkSzE7OtP7CmxmijEgGUqChxIT9Jd4ryuo0vClFbN3R4j39v8X3+p8sAhLd5xNjrS/ur3zQ5w5LYVj5vY6XMs3fHe8vctFXgnNoxUfvsTKSwePBHGGuCaAUsQNJ2bmewPAmk8lkMpnBwAYIpnsDqkaBAcCjo1W232GN5RbZBZPJ439nkI8ZMXvHTBPQYUrdtbEv5HxgCYLZvhDZO0w8YGpNe9NNmdZd95v4775KMOhDssJxWMSV3706OquiNOA3OOWI2H/X6dtiykQCCOnZsi1fzPVeL4hJi8jUMMtOWm5N3LnaZwMI9X5ACeTcmprbUgy2Qlv5Z+c5KnVEmUdSELn2xyfOcwg1/LDAyKTPGWCJ8avn2Pt7d65+KOBHOAnSz4oL6g6WyiTV21MHwOszxW2FX2Wf3ZU69lDHKyrfjx0Qxr8EUX7xxdsX1B1adIK5+PWWMctF/dVNnl8MxtOYkIX2stxbfkA75sIMyVgb9nh0ae4jF1CeP6o90AA+VnJRW1zerUPmmxCUx+1THJ34uk7m1BpUwx05BRXX1qLn+cV9vj8YMVGSQHsDE3tnQu7Os93DxZi04QXFxeXiZV2+1w2FxeqzuKwbsaHhB7NjyH3Sdx7IXmHFP8Nyykn+QbUvTdxdG12q2slHjVjdsxBgQuhf9PWRY0c/W6LqLUeUquraMxb3dwQIAUb+ItchQWMGAJLlgrPwq5+Xy1eBqi0tUe3k8cvcPTM8XdU/qyp4hOX+Y43xB2OMOxd1GI79avWohYcrtbY9nrFV8bJbVcROv7xxzNTT6o3h+BXwuXP69FyKpU4+RjSQo12vHrP2NEG79HR3OECdkCSQ3U8B6NYPX+d45sTE1Y5U1Zh0aIhc/LBBOxmWHv0t6wAg4ua1fySjBGuttv/dCtcLGKZd656LY6bzVpt6zO92aUPddyT0aN2zNPX+qvAm+ZJosxaiwvYzrdsG8jAGjxbJHRuH8g6zolx62qaFDXBLCAES2rVEcuRjZtiskIfYHMY/II98+BRkw6TyiCU9o6wAmTAA75pcp/9FK45298GrbPPCXfil8rVUxjMbaxTr8SFQoS19Dyk43/JrXOCJO9vCa74QWhYJf8Evk6/UswCd7HjashDvMoCXhFGscFp6pnnRlb8vtHOA0LrwyuGQFcKrCo/yji8WXjlMCgYSj7lewEiL9JLdLzbNxacW1ntHnLSq7nrr2eK7FGtybUz2cRkAQGyibpVdMEtr9I5C6ewlQTC75IhNtJKTHqCnCqdIIjzLBfOoqeK7A9mnR76n/15s6ndHgdhEBrBLscOW+B0k+NkhKjYNbPsiGfq3zjfAVxoCZgiYIWCGgBmCwP/x/wCKAkr5UQ2NdgAAAABJRU5ErkJggg==';
  var MP_BLUE = '#009EE3';

  var T = {
    es: {
      booking: 'Reservación', hi: 'Hola', ready: 'tu viaje está listo para reservar',
      confirmed: '¡Tu viaje está reservado!', thanks: '¡Gracias! Estamos confirmando tu pago…',
      thanksText: 'Esto tarda unos segundos. Puedes cerrar esta página; te escribiremos por WhatsApp.',
      guests: 'personas', meet: 'Punto de encuentro', directions: 'Cómo llegar', by: '',
      total: 'Precio total', iva: 'IVA incluido', deposit: 'Anticipo para reservar', balanceOwner: 'Saldo, se paga al capitán el día del viaje antes de zarpar',
      balanceVamos: 'Saldo, se paga el día del viaje', paid: 'Pagado', balanceLeft: 'Saldo pendiente',
      payTitle: 'Paga el anticipo', payCard: 'Pagar con tarjeta', orTransfer: 'O por transferencia bancaria',
      bank: 'Banco', holder: 'Titular', clabe: 'CLABE', ref: 'Concepto / referencia', amount: 'Monto', copy: 'Copiar', copied: 'Copiado',
      receipt: 'Enviar comprobante por WhatsApp', receiptMsg: 'Hola, te envío el comprobante de la transferencia del anticipo de la reservación ',
      securedBy: 'El anticipo asegura tu lugar; el saldo se paga el día del viaje.',
      captain: 'Tu capitán', save: 'Guardar contacto', copyNum: 'Copiar número', chat: 'WhatsApp',
      captainNote: 'Puedes escribirle directamente para coordinar el día del viaje. Cambios o cancelaciones, por favor con Vamos a La Paz.',
      note: 'Nota', cancel: 'Cancelación', weather: 'Si Capitanía de Puerto cierra el puerto por mal tiempo, te reembolsamos el anticipo completo.',
      questions: '¿Preguntas? Escríbenos por WhatsApp', questionsMsg: 'Hola, tengo una pregunta sobre mi reservación ',
      cancelled: 'Esta reservación fue cancelada. Si tienes dudas, escríbenos por WhatsApp.',
      invalid: 'Este enlace no es válido o ya no está disponible.', loading: 'Cargando…',
      linkPending: 'El pago con tarjeta estará disponible en unos minutos. Mientras tanto puedes pagar por transferencia.',
      paidFull: 'Pagado por completo. ¡Nos vemos pronto!', paidDeposit: 'Recibimos tu anticipo.',
      payment: 'Pago', qHi: 'aquí está tu pago', qPaid: '¡Pago recibido, gracias!', qPay: 'Paga', forBooking: 'Reservación', qTotal: 'Total a pagar',
      qReceipt: 'Hola, te envío el comprobante de la transferencia del pago ',
      payMp: 'Pagar con Mercado Pago', mpSub: 'Tarjeta, saldo de Mercado Pago y más', via: 'vía',
      mpPending: 'Tu pago con Mercado Pago está pendiente. Si elegiste OXXO, paga en la tienda antes de que venza tu ficha; se acredita en 1 a 2 días hábiles y lo verás aquí.',
      mpBack: 'Recibimos tu solicitud de pago. Si elegiste OXXO, paga en la tienda antes de que venza tu ficha; te avisaremos por WhatsApp cuando se acredite.',
      explore: 'Descubre más tours y barcos en La Paz', site: 'https://vamosalapaz.com/es', siteLabel: 'vamosalapaz.com/es'
    },
    en: {
      booking: 'Booking', hi: 'Hi', ready: 'your trip is ready to book',
      confirmed: 'Your trip is booked!', thanks: 'Thank you! We\'re confirming your payment…',
      thanksText: 'This takes a few seconds. You can close this page; we\'ll message you on WhatsApp.',
      guests: 'guests', meet: 'Meeting point', directions: 'Directions', by: '',
      total: 'Total price', iva: 'IVA (Mexican VAT) included', deposit: 'Deposit to book', balanceOwner: 'Balance, paid to the captain on the day before departure',
      balanceVamos: 'Balance, paid on the day', paid: 'Paid', balanceLeft: 'Balance due',
      payTitle: 'Pay the deposit', payCard: 'Pay by card', orTransfer: 'Or by bank transfer (Mexico)',
      bank: 'Bank', holder: 'Account holder', clabe: 'CLABE', ref: 'Reference', amount: 'Amount', copy: 'Copy', copied: 'Copied',
      receipt: 'Send the receipt on WhatsApp', receiptMsg: 'Hi, here is the transfer receipt for the deposit on booking ',
      securedBy: 'The deposit secures your spot; the balance is paid on the day.',
      captain: 'Your captain', save: 'Save contact', copyNum: 'Copy number', chat: 'WhatsApp',
      captainNote: 'Feel free to message them directly to coordinate the day. Changes or cancellations, please through Vamos a La Paz.',
      note: 'Note', cancel: 'Cancellation', weather: 'If the Port Captain closes the port for weather, we refund your full deposit.',
      questions: 'Questions? Message us on WhatsApp', questionsMsg: 'Hi, I have a question about my booking ',
      cancelled: 'This booking was cancelled. If you have questions, message us on WhatsApp.',
      invalid: 'This link is not valid or is no longer available.', loading: 'Loading…',
      linkPending: 'Card payment will be available in a few minutes. Meanwhile you can pay by bank transfer.',
      paidFull: 'Paid in full. See you soon!', paidDeposit: 'We received your deposit.',
      payment: 'Payment', qHi: 'here is your payment', qPaid: 'Payment received, thank you!', qPay: 'Pay', forBooking: 'Booking', qTotal: 'Amount due',
      qReceipt: 'Hi, here is the transfer receipt for payment ',
      payMp: 'Pay with Mercado Pago', mpSub: 'Card, Mercado Pago balance and more', via: 'via',
      mpPending: 'Your Mercado Pago payment is pending. If you chose OXXO, pay at the store before your voucher expires; it takes 1 to 2 business days to show here.',
      mpBack: 'We got your payment request. If you chose OXXO, pay at the store before your voucher expires; we\'ll message you on WhatsApp once it\'s confirmed.',
      explore: 'Explore more tours and boats in La Paz', site: 'https://vamosalapaz.com', siteLabel: 'vamosalapaz.com'
    }
  };
  var L = T.es, lang = 'es', inv = null, bank = {}, root, top, foot, tries = 0;

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function get() {
    return fetch(HOOK, { method: 'POST', body: new URLSearchParams({ action: 'get', t: TOKEN }) })
      .then(function (r) { return r.text(); })
      .then(function (t) { try { return JSON.parse(t); } catch (e) { return { ok: false }; } });
  }
  function money(n) { return '$' + (Number(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 }) + ' MXN'; }
  function day(iso) {
    if (!iso) return '';
    return new Date(iso + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function shortDay(iso) {
    if (!iso) return '';
    return new Date(iso + 'T12:00:00').toLocaleDateString(lang === 'en' ? 'en-US' : 'es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function first(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
  function clean(s) { return String(s || '').replace(/^[\s,]+|[\s,]+$/g, ''); }
  function wa(num, text) { return 'https://wa.me/' + num + (text ? '?text=' + encodeURIComponent(text) : ''); }
  function copyBtn(value, label) {
    return h('button', { class: 'cp', type: 'button', onclick: function (e) {
      var b = e.currentTarget;
      (navigator.clipboard ? navigator.clipboard.writeText(value) : Promise.reject()).then(function () { b.textContent = L.copied; setTimeout(function () { b.textContent = label || L.copy; }, 1800); }, function () { prompt(label || L.copy, value); });
    } }, [label || L.copy]);
  }

  function css() {
    var s = document.createElement('style');
    s.textContent = [
      '.vr{max-width:520px;margin:0 auto;padding:0 16px 72px;font-family:"DM Sans",system-ui,sans-serif;color:' + INK + ';font-size:17px;line-height:1.5}',
      '.vr-top{display:flex;justify-content:center;padding:18px 0 12px}.vr-top img{height:46px;width:auto;display:block}',
      '.vr-stripe{display:flex;height:5px;border-radius:3px;overflow:hidden;margin:0 0 20px}.vr-stripe i{flex:1}',
      '.vr .eyebrow{font-size:13px;letter-spacing:.02em;color:#5b6772;margin:0 0 6px}',
      '.vr h1{font-size:26px;line-height:1.2;margin:0 0 14px;font-weight:600;color:' + C.gulf + '}',
      '.vr h2{font-size:15px;font-weight:600;margin:14px 0 4px;color:' + C.pacific + '}.vr h2:first-child{margin-top:0}',
      '.vr .card{background:#fff;border:1px solid #e3ddd2;border-radius:16px;padding:16px;margin:0 0 12px}',
      '.vr .trip-card{border-left:5px solid ' + C.aqua + '}.vr .money-card{border-left:5px solid ' + C.gold + '}.vr .pay-card{border-left:5px solid ' + BRAND + '}.vr .cap-card{border-left:5px solid ' + C.lima + '}',
      '.vr .trip{font-weight:600;font-size:19px;margin:0 0 4px}',
      '.vr .muted{color:#5b6772;margin:2px 0 0}',
      '.vr .money{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-top:1px solid #f0ebe3}.vr .money:first-child{border-top:0}',
      '.vr .money b{white-space:nowrap}.vr .money.total{font-size:19px;color:' + C.gulf + '}.vr .money.total b{font-size:21px}',
      '.vr .iva{font-size:13px;color:#5b6772;margin:-4px 0 6px;text-align:right}',
      '.vr .pre{white-space:pre-wrap;color:#3c4954;margin:0}',
      '.vr .btn{display:block;width:100%;box-sizing:border-box;text-align:center;border:0;border-radius:14px;padding:15px;font:inherit;font-weight:600;cursor:pointer;text-decoration:none;margin-top:12px}',
      '.vr .pri{background:' + BRAND + ';color:#fff}.vr .wa{background:#1f9d55;color:#fff}.vr .sec{background:#fff;color:' + INK + ';border:1px solid #c9c1b4}',
      '.vr .kv{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #f0ebe3}.vr .kv:first-of-type{border-top:0}',
      '.vr .kv span{color:#5b6772;font-size:14px}.vr .kv b{display:block;word-break:break-all;font-size:16px}',
      '.vr .cp{flex:0 0 auto;background:#fff;border:1px solid #c9c1b4;border-radius:10px;padding:6px 10px;font:inherit;font-size:14px;cursor:pointer;color:' + INK + '}',
      '.vr .or{font-size:15px;font-weight:600;color:' + C.gulf + ';margin:18px 0 4px}',
      '.vr .row3{display:flex;gap:8px;flex-wrap:wrap}.vr .row3 .btn{flex:1 1 30%;margin-top:0;padding:12px 8px;font-size:15px}',
      '.vr .nm{font-weight:600;font-size:19px;margin:0}.vr .ph{color:#3c4954;margin:2px 0 10px}',
      '.vr .msg{border-radius:12px;padding:12px 14px;margin:0 0 12px}',
      '.vr .ok{background:#dcf6f5;color:' + C.gulf + '}.vr .warn{background:#fdf1e1;color:#7a4b00}',
      '.vr a.map{color:' + C.pacific + ';font-weight:600}',
      '.vr .mp{background:' + MP_BLUE + ';color:#fff}.vr .mp-sub{font-size:13px;color:#5b6772;text-align:center;margin:6px 0 0}',
      '.vr-top.gm{flex-direction:column;align-items:center;gap:8px}.vr-top .gm-logo{height:auto;width:100%;max-width:300px;border-radius:12px}',
      '.vr-top .via{display:flex;align-items:center;gap:6px;font-size:13px;color:#5b6772}.vr-top .via img{height:24px}',
      '.vr-foot{text-align:center;margin:28px 0 0;padding:18px 0 0;border-top:1px solid #e3ddd2}',
      '.vr-foot p{margin:0;color:#5b6772;font-size:15px}.vr-foot a{display:inline-block;margin-top:4px;color:' + C.pacific + ';font-weight:600;text-decoration:none;font-size:17px}'
    ].join('');
    document.head.appendChild(s);
  }

  function mount() {
    css();
    root = h('div', { class: 'vr' });
    document.body.style.background = C.foam;
    var nav = document.querySelector('.w-nav, header, nav'), anchor = document.querySelector('main') || document.body;
    if (nav && nav.parentNode === anchor) nav.insertAdjacentElement('afterend', root); else anchor.appendChild(root);
    var shell = root; root = h('div');
    var stripe = h('div', { class: 'vr-stripe' });
    [C.aqua, C.pacific, C.lima, C.gold, C.orange, BRAND].forEach(function (c) { stripe.appendChild(h('i', { style: 'background:' + c })); });
    top = h('div', { class: 'vr-top' }, [h('img', { src: LOGO, alt: 'Vamos a La Paz' })]);
    shell.appendChild(top);
    shell.appendChild(stripe);
    shell.appendChild(root);
    foot = h('div', { class: 'vr-foot' });
    shell.appendChild(foot);
    root.appendChild(h('p', { class: 'muted', text: L.loading }));
    if (!TOKEN) return fail();
    load();
  }
  function load() {
    get().then(function (r) {
      inv = r && r.ok && r.inv;
      if (!inv || !inv.fields) return fail();
      bank = r.bank || {};
      lang = inv.fields.Language === 'English' ? 'en' : 'es'; L = T[lang];
      document.documentElement.lang = lang;
      brand();
      render();
      footer();
      // Coming back from Stripe: the payment webhook can lag a few seconds behind the redirect.
      if (JUST_PAID && !depositPaid() && tries < 6) { tries++; setTimeout(load, 4000); }
    }, fail);
  }
  function fail() { root.innerHTML = ''; root.appendChild(h('p', { class: 'msg warn', text: T.es.invalid + ' / ' + T.en.invalid })); footer(); }

  // Every page ends with a link to the main site, in the customer's language.
  function footer() {
    foot.innerHTML = '';
    foot.appendChild(h('p', { text: L.explore }));
    foot.appendChild(h('a', { href: L.site }, [L.siteLabel + ' →']));
  }
  // Good Medicine payments: Good Medicine logo on top, "vía Vamos a La Paz" under it.
  function brand() {
    var gm = f()['Business line'] === 'Good Medicine direct';
    top.innerHTML = ''; top.className = 'vr-top' + (gm ? ' gm' : '');
    if (!gm) { top.appendChild(h('img', { src: LOGO, alt: 'Vamos a La Paz' })); return; }
    top.appendChild(h('img', { class: 'gm-logo', src: GM_LOGO, alt: 'Good Medicine La Paz Charters' }));
    top.appendChild(h('div', { class: 'via' }, [L.via + ' ', h('img', { src: LOGO, alt: 'Vamos a La Paz' })]));
  }
  function eyebrowName() { return f()['Business line'] === 'Good Medicine direct' ? 'Good Medicine La Paz Charters · ' + L.via + ' Vamos a La Paz' : 'Vamos a La Paz'; }

  function f() { return inv.fields; }
  function isQuick() { return f().Kind === 'Quick payment'; }
  function depositPaid() { var x = f(); return x.Status === 'Deposit paid' || x.Status === 'Paid in full'; }

  function render() {
    var x = f(), st = x.Status;
    if (isQuick()) return renderQuick();
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'eyebrow', text: eyebrowName() + ' · ' + L.booking + ' ' + (x['Invoice number'] || '') }));
    if (st === 'Cancelled') {
      root.appendChild(h('p', { class: 'msg warn', text: L.cancelled }));
      root.appendChild(h('a', { class: 'btn wa', href: wa(VAMOS_WA, L.questionsMsg + (x['Invoice number'] || '')) }, [L.questions]));
      return;
    }
    var paid = depositPaid();
    if (paid) root.appendChild(h('h1', { text: L.confirmed }));
    else if (JUST_PAID) { root.appendChild(h('h1', { text: L.thanks })); root.appendChild(h('p', { class: 'muted', style: 'margin:-6px 0 14px', text: L.thanksText })); }
    else root.appendChild(h('h1', { text: L.hi + ' ' + first(x['Billed to']) + ', ' + L.ready }));

    if (paid) root.appendChild(h('p', { class: 'msg ok', text: st === 'Paid in full' ? L.paidFull : L.paidDeposit }));
    if (paid) { var cap = captainCard(); if (cap) root.appendChild(cap); }
    root.appendChild(tripCard());
    root.appendChild(moneyCard(paid));
    if (!paid && !JUST_PAID) root.appendChild(payCard());
    root.appendChild(termsCard());
    root.appendChild(h('a', { class: 'btn sec', href: wa(VAMOS_WA, L.questionsMsg + (x['Invoice number'] || '')) }, [L.questions]));
  }

  // Quick payment: one amount with a description (an extra hour, an add-on).
  function renderQuick() {
    var x = f(), st = x.Status, num = x['Invoice number'] || '', amount = Number(x.Deposit) || Number(x['Trip price']) || 0;
    root.innerHTML = '';
    root.appendChild(h('p', { class: 'eyebrow', text: eyebrowName() + ' · ' + L.payment + ' ' + num }));
    if (st === 'Cancelled') {
      root.appendChild(h('p', { class: 'msg warn', text: L.cancelled }));
      root.appendChild(h('a', { class: 'btn wa', href: wa(VAMOS_WA, L.questionsMsg + num) }, [L.questions]));
      return;
    }
    var paid = depositPaid();
    if (paid) root.appendChild(h('h1', { text: L.qPaid }));
    else if (JUST_PAID) { root.appendChild(h('h1', { text: L.thanks })); root.appendChild(h('p', { class: 'muted', style: 'margin:-6px 0 14px', text: L.thanksText })); }
    else root.appendChild(h('h1', { text: L.hi + ' ' + first(x['Billed to']) + ', ' + L.qHi }));
    root.appendChild(h('div', { class: 'card trip-card' }, [
      h('p', { class: 'trip', text: x.Trip || '' }),
      x['Extra for booking'] ? h('p', { class: 'muted', text: L.forBooking + ' ' + x['Extra for booking'] }) : null,
      x['Bókun booking ID'] ? h('p', { class: 'muted', text: [L.forBooking + ' ' + x['Bókun booking ID'], shortDay(x['Trip date']), x.Guests ? x.Guests + ' ' + L.guests : ''].filter(Boolean).join(' · ') }) : null,
      x['Note to customer'] ? h('p', { class: 'pre', style: 'margin-top:8px', text: x['Note to customer'] }) : null
    ]));
    var m = h('div', { class: 'card money-card' });
    var lines = [];
    try { lines = JSON.parse(x['Line items'] || '[]'); } catch (e) { lines = []; }
    if (Array.isArray(lines) && lines.length > 1) lines.forEach(function (l) {
      if (l && l.d) m.appendChild(h('div', { class: 'money' }, [h('span', { text: l.d }), h('b', { text: money(l.a) })]));
    });
    m.appendChild(h('div', { class: 'money total' }, [h('span', { text: paid ? L.paid : L.qTotal }), h('b', { text: money(amount) })]));
    m.appendChild(h('p', { class: 'iva', text: L.iva }));
    root.appendChild(m);
    if (!paid && !JUST_PAID) {
      var card = h('div', { class: 'card pay-card' });
      card.appendChild(h('h2', { text: L.qPay + ' · ' + money(amount) }));
      payButtons(card, amount);
      if (bank.CLABE) {
        card.appendChild(h('p', { class: 'or', text: L.orTransfer }));
        [[L.bank, bank.Bank], [L.holder, bank['Account holder']], [L.clabe, bank.CLABE, true], [L.ref, num, true], [L.amount, money(amount)]].forEach(function (r) {
          if (!r[1]) return;
          card.appendChild(h('div', { class: 'kv' }, [h('div', null, [h('span', { text: r[0] }), h('b', { text: r[1] })]), r[2] ? copyBtn(String(r[1]).replace(/\s/g, '')) : null]));
        });
        if (bank['Extra note']) card.appendChild(h('p', { class: 'muted', style: 'font-size:14px', text: bank['Extra note'] }));
        card.appendChild(h('a', { class: 'btn wa', href: wa(VAMOS_WA, L.qReceipt + num) }, [L.receipt]));
      }
      root.appendChild(card);
    }
    root.appendChild(h('a', { class: 'btn sec', href: wa(VAMOS_WA, L.questionsMsg + num) }, [L.questions]));
  }

  function tripCard() {
    var x = f();
    var dates = day(x['Trip date']) + (x['End date'] && x['End date'] > x['Trip date'] ? ' – ' + day(x['End date']) : '');
    var meet = [x['Meeting point'], x['Meeting time']].filter(Boolean).join(', ');
    return h('div', { class: 'card trip-card' }, [
      h('p', { class: 'trip', text: x.Trip || '' }),
      x.Provider ? h('p', { class: 'muted', text: x.Provider }) : null,
      h('p', { class: 'muted', text: [dates, x.Duration].filter(Boolean).join(' · ') }),
      x.Guests ? h('p', { class: 'muted', text: x.Guests + ' ' + L.guests }) : null,
      meet ? h('p', { class: 'muted' }, [L.meet + ': ' + meet + (x['Meeting map link'] ? ' · ' : ''),
        x['Meeting map link'] ? h('a', { class: 'map', href: x['Meeting map link'], target: '_blank', rel: 'noopener' }, [L.directions]) : null]) : null
    ]);
  }

  function moneyCard(paid) {
    var x = f(), price = Number(x['Trip price']) || 0, dep = Number(x.Deposit) || 0, got = Number(x['Amount paid']) || 0;
    var owner = x['Balance collected by'] === 'Owner';
    var m = h('div', { class: 'card money-card' });
    m.appendChild(h('div', { class: 'money total' }, [h('span', { text: L.total }), h('b', { text: money(price) })]));
    m.appendChild(h('p', { class: 'iva', text: L.iva }));
    m.appendChild(h('div', { class: 'money' }, [h('span', { text: L.deposit }), h('b', { text: money(dep) })]));
    if (owner) m.appendChild(h('div', { class: 'money' }, [h('span', { text: L.balanceOwner }), h('b', { text: money(price - dep) })]));
    else {
      if (got > 0) m.appendChild(h('div', { class: 'money' }, [h('span', { text: L.paid }), h('b', { text: money(got) })]));
      m.appendChild(h('div', { class: 'money' }, [h('span', { text: got > 0 ? L.balanceLeft : L.balanceVamos }), h('b', { text: money(Math.max(0, price - Math.max(got, 0))) })]));
    }
    return m;
  }

  function payCard() {
    var x = f(), dep = Number(x.Deposit) || 0, num = x['Invoice number'] || '';
    var card = h('div', { class: 'card pay-card' });
    card.appendChild(h('h2', { text: L.payTitle + ' · ' + money(dep) }));
    payButtons(card, dep);
    if (bank.CLABE) {
      card.appendChild(h('p', { class: 'or', text: L.orTransfer }));
      [[L.bank, bank.Bank], [L.holder, bank['Account holder']], [L.clabe, bank.CLABE, true], [L.ref, num, true], [L.amount, money(dep)]].forEach(function (r) {
        if (!r[1]) return;
        card.appendChild(h('div', { class: 'kv' }, [h('div', null, [h('span', { text: r[0] }), h('b', { text: r[1] })]), r[2] ? copyBtn(String(r[1]).replace(/\s/g, '')) : null]));
      });
      if (bank['Extra note']) card.appendChild(h('p', { class: 'muted', style: 'font-size:14px', text: bank['Extra note'] }));
      card.appendChild(h('a', { class: 'btn wa', href: wa(VAMOS_WA, L.receiptMsg + num) }, [L.receipt]));
    }
    card.appendChild(h('p', { class: 'muted', style: 'font-size:14px;margin-top:10px', text: L.securedBy }));
    return card;
  }

  // Card (Stripe) and Mercado Pago buttons for the amount due. A Mercado Pago link only shows while it is valid.
  function payButtons(card, amount) {
    var x = f();
    var link = x['Stripe payment link'], linkOk = link && Number(x['Payment link amount']) === amount;
    var mp = x['Mercado Pago link'], exp = x['Mercado Pago link expires'];
    var mpOk = mp && Number(x['Mercado Pago link amount']) === amount && (!exp || new Date(exp).getTime() > Date.now());
    if (x['Mercado Pago pending']) card.appendChild(h('p', { class: 'msg ok', text: L.mpPending }));
    else if (MP_PENDING_BACK) card.appendChild(h('p', { class: 'msg ok', text: L.mpBack }));
    if (linkOk) card.appendChild(h('a', { class: 'btn pri', href: link }, [L.payCard + ' · ' + money(amount)]));
    if (mpOk) {
      card.appendChild(h('a', { class: 'btn mp', href: mp }, [L.payMp]));
      card.appendChild(h('p', { class: 'mp-sub', text: L.mpSub }));
    }
    if (!linkOk && !mpOk) card.appendChild(h('p', { class: 'msg warn', text: L.linkPending }));
  }

  // Captain's contact: the server only includes it once the deposit is paid and the owner has confirmed.
  function captainCard() {
    var raw = clean(f()['Shared owner contact']);
    if (!raw) return null;
    var parts = raw.split('|'), nm = clean(parts[0]), ph = clean(parts[1]);
    if (!ph) return null;
    var d = ph.replace(/\D/g, ''); if (d.length === 10) d = '52' + d;
    return h('div', { class: 'card cap-card' }, [
      h('h2', { text: L.captain }), h('p', { class: 'nm', text: nm }), h('p', { class: 'ph', text: ph }),
      h('div', { class: 'row3' }, [
        h('a', { class: 'btn pri', href: HOOK + '?action=vcard&t=' + encodeURIComponent(TOKEN) }, [L.save]),
        copyBtnBig(ph),
        h('a', { class: 'btn wa', href: wa(d) }, [L.chat])
      ]),
      h('p', { class: 'muted', style: 'font-size:14px;margin-top:10px', text: L.captainNote })
    ]);
  }
  function copyBtnBig(ph) {
    return h('button', { class: 'btn sec', type: 'button', onclick: function (e) {
      var b = e.currentTarget;
      (navigator.clipboard ? navigator.clipboard.writeText(ph) : Promise.reject()).then(function () { b.textContent = L.copied; }, function () { prompt(L.copyNum, ph); });
    } }, [L.copyNum]);
  }

  function termsCard() {
    var x = f(), t = h('div', { class: 'card' });
    if (x['Note to customer']) { t.appendChild(h('h2', { text: L.note })); t.appendChild(h('p', { class: 'pre', text: x['Note to customer'] })); }
    t.appendChild(h('h2', { text: L.cancel }));
    t.appendChild(h('p', { class: 'pre', text: [x['Cancellation policy'], L.weather].filter(Boolean).join('\n') }));
    return t;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
