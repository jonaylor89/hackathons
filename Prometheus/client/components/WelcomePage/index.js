import React from 'react';

export default class WelcomePage extends React.Component {
  constructor(props) {
    super(props);
  }

  _continue() {
    this.props.finish();
  }

  render() {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Roboto, Ubuntu, sans-serif',
          alignItems: 'center'
        }}
      >
        <style>{`
          .holdup {
            transform: translateY(-200px);
            opacity: 0;
            transition: transform ease-out 500ms, opacity ease-out 500ms;
          }
        `}</style>
        <div
          className="holdup"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center'
          }}
          ref={r => {
            setTimeout(() => {
              if (r) {
                r.style.opacity = '1';
                r.style.transform = 'translateY(0px)';
              }
            }, 0);
          }}
        >
          <img
              src={require("./Octo.png")}
              height="130px"
              draggable={false}
              style={{
                  padding: '10px',
                  userSelect: 'none',
                  WebkitUserDrag: 'none'
              }}
          />
        </div>
        <div
          style={{
            fontSize: '2.125em',
            textAlign: 'center',
            margin: '1.5em 0 .25em 0'
          }}
        >
          What would you like to know?
        </div>
        <div
          style={{
            fontSize: '0.875em',
            lineHeight: '1.725em',
            maxWidth: '344px',
            marginTop: '3em'
          }}
        >
          Use Prometheus to query realtime data about the world's current facts, knowledge base, and data-driven conversations.
        </div>
        <button
          onClick={this._continue.bind(this)}
          style={{
            textTransform: 'uppercase',
            textDecoration: 'none',
            fontWeight: '500',
            background: 'rgb(3,155,229)',
            color: 'white',
            border: '1px solid rgb(3,155,229)',
            borderRadius: '3px',
            boxShadow: '0 2px 5px 0 rgba(0,0,0,.26)',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '8px',
            marginTop: '2em'
          }}
        >
          Start
        </button>
        <img
            src={require("./University.png")}
            draggable={false}
            style={{
                padding: '10px',
                userSelect: 'none',
                WebkitUserDrag: 'none',
                position: 'absolute',
                bottom: '24px',
                background: 'black',
                height: '93px',
                filter: 'invert(1)',
                opacity: '0.6'
            }}
        />
      </div>
    );
  }
};
