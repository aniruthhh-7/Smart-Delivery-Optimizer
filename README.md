# Smart Delivery Optimizer

This project is a simple, visual web application designed to show how a computer can figure out the fastest route for a sequence of delivery stops. It is built to be easily understood without any deep mathematical or programming knowledge.

## How it works

Behind the scenes, the application uses an approach called Branch and Bound.

When you have a list of stops (like a warehouse plus a few drop-offs), trying to find the absolute shortest driving distance requires checking different path combinations. As the number of stops increases, the number of possible routes explodes. 

Instead of checking every single bad route completely, the system determines an initial fast standard. Then, as it explores other possibilities, it immediately skips a route if it is already shown to be longer than the known standard. This skips potentially millions of unnecessary calculations and finds the definitively fastest route.

## Visual Design

The app is built as a highly optimized, single-page web dashboard using HTML, CSS, and pure JavaScript. The interface was tailored specifically to be sleek, straightforward, and readable.

- **Dynamic Selectors:** Users can choose between 4 to 12 stops. For lower numbers of stops, the logic will actually animate step-by-step so you can watch its "brain" skip bad boundaries. For larger sets, it performs the calculation instantly to maintain performance.
- **Trace Logs:** The sidebar features a rolling trace log that acts like the GPS brain, explaining in plain English when it finds a good route or when it skips a bad one.

## Running Locally

Because this project uses vanilla web technologies, you do not need complex local environments. 

1. Simply clone this repository.
2. Navigate to the `frontend` folder.
3. Open `index.html` directly in your web browser. 

Alternatively, if you have Python installed, you can start a local testing server. Run the following command from the `frontend` folder:

python -m http.server 8000

Then visit http://localhost:8000 in your browser.

## Tech Stack

- **Frontend Interface:** HTML5, modern CSS3.
- **Visuals:** Native HTML5 Canvas element.
- **Logic Matrix:** Vanilla JavaScript.
- **Original Prototype:** A fallback python script (tsp_branch_and_bound.py) is also included which accomplishes the same goal through Python console outputs and Matplotlib plots.
